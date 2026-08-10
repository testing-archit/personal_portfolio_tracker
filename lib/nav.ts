import { friendlyDate } from "@/lib/format";
import type { DailyMovement, Etf, Fund, Holding, NavPoint, PortfolioPoint } from "@/lib/types";

type MfApiResponse = {
  data?: NavPoint[];
};

export type LatestFundNav = {
  date: string;
  nav: number;
};

// Vercel's free plan doesn't give background revalidation of `fetch` caching any
// reliability guarantee for a low-traffic app like this one: if a single revalidation
// fails, the stale response can be served indefinitely with nothing visibly wrong.
// Traffic here is low enough that hitting upstream on every render is cheap, so every
// market-data fetch below opts out of the cache entirely instead of trusting a revalidate
// window we can't observe.
const NO_STORE = { cache: "no-store" as const };

const monthNumbers: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

function apiDateToIso(value: string) {
  const [day, month, year] = value.split("-");
  return `${year}-${month}-${day}`;
}

function amfiDateToIso(value: string) {
  const [day, month, year] = value.trim().split("-");
  const monthNumber = monthNumbers[month?.toLowerCase()];
  return day && monthNumber && year ? `${year}-${monthNumber}-${day.padStart(2, "0")}` : null;
}

function dateToIso(date: Date) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function timestampToIso(timestamp: number) {
  return dateToIso(new Date(timestamp * 1000));
}

function todayIso() {
  return dateToIso(new Date());
}

function shortLabel(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`));
}

export async function getLatestFundNavs(): Promise<ReadonlyMap<number, LatestFundNav>> {
  try {
    const response = await fetch("https://portal.amfiindia.com/spages/NAVAll.txt", {
      headers: { "User-Agent": "Mozilla/5.0 Folio/1.0" },
      ...NO_STORE,
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      console.error(`getLatestFundNavs: AMFI feed returned ${response.status}`);
      return new Map();
    }

    const latestNavs = new Map<number, LatestFundNav>();
    const body = await response.text();
    for (const line of body.split(/\r?\n/)) {
      const columns = line.split(";");
      if (columns.length < 6) continue;
      const schemeCode = Number(columns[0]);
      const nav = Number(columns[4]);
      const date = amfiDateToIso(columns[5]);
      if (Number.isInteger(schemeCode) && Number.isFinite(nav) && nav > 0 && date) {
        latestNavs.set(schemeCode, { date, nav });
      }
    }
    if (latestNavs.size === 0) {
      console.error("getLatestFundNavs: AMFI feed parsed to zero entries, format may have changed");
    }
    return latestNavs;
  } catch (error) {
    console.error("getLatestFundNavs failed", error);
    return new Map();
  }
}

async function getNavHistory(schemeCode: number): Promise<NavPoint[]> {
  try {
    const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
      ...NO_STORE,
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as MfApiResponse;
    return payload.data ?? [];
  } catch (error) {
    console.error(`getNavHistory(${schemeCode}) failed`, error);
    return [];
  }
}

export function enrichFund(fund: Fund, history: NavPoint[], officialLatest?: LatestFundNav): Holding {
  const apiLatest = history[0]
    ? { date: apiDateToIso(history[0].date), nav: Number(history[0].nav) }
    : null;
  const latest = officialLatest && (!apiLatest || officialLatest.date >= apiLatest.date)
    ? officialLatest
    : apiLatest;
  const purchasePoint = history
    .slice()
    .reverse()
    .find((point) => apiDateToIso(point.date) >= fund.purchase_date);
  const currentNav = latest?.nav ?? null;
  const purchaseNav = fund.purchase_nav ?? (purchasePoint ? Number(purchasePoint.nav) : null);
  const units = fund.units ?? (purchaseNav ? fund.invested_amount / purchaseNav : null);
  const currentValue = currentNav && units ? currentNav * units : fund.invested_amount;
  const gain = currentValue - fund.invested_amount;

  return {
    id: fund.id,
    user_id: fund.user_id,
    instrumentType: "mutual_fund",
    name: fund.name,
    short_name: fund.short_name,
    category: fund.category,
    invested_amount: fund.invested_amount,
    purchase_date: fund.purchase_date,
    units: fund.units,
    purchase_nav: fund.purchase_nav,
    currentNav,
    currentNavDate: latest ? friendlyDate(latest.date) : null,
    effectivePurchaseNav: purchaseNav,
    effectiveUnits: units,
    currentValue,
    gain,
    gainPercent: fund.invested_amount ? (gain / fund.invested_amount) * 100 : 0,
    isEstimated: fund.units === null || fund.purchase_nav === null,
  };
}

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number; regularMarketTime?: number };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
};

type EtfPricePoint = { date: string; price: number };

export type EtfSnapshot = {
  history: EtfPricePoint[];
  live: { price: number; timestamp: number | null } | null;
};

const EMPTY_ETF_SNAPSHOT: EtfSnapshot = { history: [], live: null };

// A single Yahoo chart call with a long range returns both the full daily-close
// history (meta aside) *and* the live regularMarketPrice/regularMarketTime in its
// `meta` block, so one request covers what used to be two separate fetches
// (a `range=1d` quote call and a `range=1mo` history call). `range=max` also fixes a
// real bug: with only a 1-month window, any date older than that had no matching close
// and fell back to flat book value, producing a fake one-day "jump" once real prices
// started — full history removes that discontinuity.
async function getEtfSnapshot(symbol: string): Promise<EtfSnapshot> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.NS?range=max&interval=1d`,
      {
        headers: { "User-Agent": "Mozilla/5.0 Folio/1.0" },
        ...NO_STORE,
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) return EMPTY_ETF_SNAPSHOT;
    const payload = (await response.json()) as YahooChartResponse;
    const result = payload.chart?.result?.[0];
    if (!result) return EMPTY_ETF_SNAPSHOT;

    const prices = new Map<string, EtfPricePoint>();
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    for (const [index, timestamp] of (result.timestamp ?? []).entries()) {
      const price = closes[index];
      if (price && Number.isFinite(price)) {
        const date = timestampToIso(timestamp);
        prices.set(date, { date, price });
      }
    }
    const meta = result.meta;
    const live = meta?.regularMarketPrice
      ? { price: meta.regularMarketPrice, timestamp: meta.regularMarketTime ?? null }
      : null;
    if (live && meta?.regularMarketTime) {
      prices.set(timestampToIso(meta.regularMarketTime), { date: timestampToIso(meta.regularMarketTime), price: live.price });
    }
    return { history: [...prices.values()].sort((a, b) => a.date.localeCompare(b.date)), live };
  } catch (error) {
    console.error(`getEtfSnapshot(${symbol}) failed`, error);
    return EMPTY_ETF_SNAPSHOT;
  }
}

export function enrichEtf(etf: Etf, snapshot: EtfSnapshot | undefined): Holding {
  const live = snapshot?.live ?? null;
  const lastClose = snapshot?.history.at(-1) ?? null;
  const price = live?.price ?? lastClose?.price ?? etf.last_price ?? etf.avg_price;
  const currentValue = price * etf.quantity;
  const gain = currentValue - etf.invested_amount;
  const quoteTime = live?.timestamp
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(live.timestamp * 1000))
    : lastClose
      ? `Close, ${friendlyDate(lastClose.date)}`
      : etf.last_price_at
        ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(etf.last_price_at))
        : "Saved price";

  return {
    id: etf.id,
    user_id: etf.user_id,
    instrumentType: "etf",
    name: etf.name,
    short_name: etf.short_name,
    category: etf.category,
    invested_amount: etf.invested_amount,
    purchase_date: null,
    units: etf.quantity,
    purchase_nav: etf.avg_price,
    currentNav: price,
    currentNavDate: quoteTime,
    effectivePurchaseNav: etf.avg_price,
    effectiveUnits: etf.quantity,
    currentValue,
    gain,
    gainPercent: etf.invested_amount ? (gain / etf.invested_amount) * 100 : 0,
    isEstimated: false,
  };
}

export type MarketData = {
  latestFundNavs: ReadonlyMap<number, LatestFundNav>;
  fundHistories: ReadonlyMap<number, NavPoint[]>;
  etfSnapshots: ReadonlyMap<string, EtfSnapshot>;
};

// Fetched once per render and shared by enrichFund/enrichEtf/getPortfolioSeries below,
// instead of each of them independently re-fetching the same scheme code or symbol.
// Halving the number of outbound requests matters on Vercel's free plan: it keeps the
// function comfortably under the execution-time cap even when upstream is slow, and
// it's kinder to mfapi.in/Yahoo, which have no authenticated, higher-rate-limit tier here.
export async function loadMarketData(funds: Fund[], etfs: Etf[]): Promise<MarketData> {
  const schemeCodes = [...new Set(funds.map((fund) => fund.scheme_code))];
  const symbols = [...new Set(etfs.map((etf) => etf.symbol))];
  const [latestFundNavs, historyEntries, snapshotEntries] = await Promise.all([
    getLatestFundNavs(),
    Promise.all(schemeCodes.map(async (code) => [code, await getNavHistory(code)] as const)),
    Promise.all(symbols.map(async (symbol) => [symbol, await getEtfSnapshot(symbol)] as const)),
  ]);
  return {
    latestFundNavs,
    fundHistories: new Map(historyEntries),
    etfSnapshots: new Map(snapshotEntries),
  };
}

export function getPortfolioSeries(
  funds: Fund[],
  etfs: Etf[],
  fundHistories: ReadonlyMap<number, NavPoint[]>,
  etfSnapshots: ReadonlyMap<string, EtfSnapshot>,
  latestFundNavs: ReadonlyMap<number, LatestFundNav> = new Map(),
): PortfolioPoint[] {
  const datedHistories = funds.map((fund) => {
    const history = fundHistories.get(fund.scheme_code) ?? [];
    const historicalPoints = history
      .map((point) => ({ date: apiDateToIso(point.date), nav: Number(point.nav) }))
      .filter((point) => point.date >= fund.purchase_date && Number.isFinite(point.nav));
    const officialLatest = latestFundNavs.get(fund.scheme_code);
    if (officialLatest && officialLatest.date >= fund.purchase_date) historicalPoints.push(officialLatest);
    const chronological = [...new Map(historicalPoints.map((point) => [point.date, point])).values()]
      .sort((a, b) => a.date.localeCompare(b.date));
    const purchaseNav = fund.purchase_nav ?? chronological[0]?.nav ?? null;
    const units = fund.units ?? (purchaseNav ? fund.invested_amount / purchaseNav : null);
    return { fund, chronological, units };
  });
  const etfHistories = etfs.map((etf) => ({ etf, history: etfSnapshots.get(etf.symbol)?.history ?? [] }));
  const dates = [...new Set(datedHistories.flatMap(({ chronological }) => chronological.map((point) => point.date)))].sort();
  const etfInvested = etfs.reduce((sum, etf) => sum + etf.invested_amount, 0);
  const etfCurrent = etfHistories.reduce((sum, item) => {
    const latestPrice = item.history.at(-1)?.price ?? item.etf.last_price ?? item.etf.avg_price;
    return sum + latestPrice * item.etf.quantity;
  }, 0);

  if (dates.length < 2) {
    const invested = funds.reduce((sum, fund) => sum + fund.invested_amount, 0) + etfInvested;
    const currentFunds = datedHistories.reduce((sum, item) => {
      const latest = item.chronological.at(-1)?.nav;
      return sum + (latest && item.units ? latest * item.units : item.fund.invested_amount);
    }, 0);
    const earliestPurchase = funds.reduce<string | null>(
      (min, fund) => (!min || fund.purchase_date < min ? fund.purchase_date : min),
      null,
    );
    const baselineDate = earliestPurchase ?? todayIso();
    return [
      { date: baselineDate, label: shortLabel(baselineDate), value: invested },
      { date: todayIso(), label: "Latest", value: currentFunds + etfCurrent },
    ];
  }

  return dates.map((date) => {
    const fundValue = datedHistories.reduce((sum, item) => {
      const point = [...item.chronological].reverse().find((candidate) => candidate.date <= date);
      return sum + (point && item.units ? point.nav * item.units : item.fund.invested_amount);
    }, 0);
    const etfValue = etfHistories.reduce((sum, item) => {
      const point = [...item.history].reverse().find((candidate) => candidate.date <= date);
      return sum + (point ? point.price * item.etf.quantity : item.etf.invested_amount);
    }, 0);
    return {
      date,
      label: shortLabel(date),
      value: fundValue + etfValue,
    };
  });
}

// Below this threshold a day's move is treated as noise (rounding/estimation drift)
// rather than a real market move, and rendered as "Flat" in the movement calendar.
const FLAT_THRESHOLD_PERCENT = 0.005;

export function getDailyMovement(series: PortfolioPoint[]): DailyMovement[] {
  return series.slice(1).map((point, index) => {
    const previous = series[index].value;
    if (!previous) return { date: point.date, change: 0 };
    const change = ((point.value - previous) / previous) * 100;
    return { date: point.date, change: Math.abs(change) < FLAT_THRESHOLD_PERCENT ? 0 : change };
  });
}
