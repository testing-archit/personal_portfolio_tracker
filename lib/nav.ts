import { friendlyDate } from "@/lib/format";
import type { DailyMovement, Etf, Fund, Holding, NavPoint, PortfolioPoint } from "@/lib/types";

type MfApiResponse = {
  data?: NavPoint[];
};

export type LatestFundNav = {
  date: string;
  nav: number;
};

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

export async function getLatestFundNavs(): Promise<ReadonlyMap<number, LatestFundNav>> {
  try {
    const response = await fetch("https://portal.amfiindia.com/spages/NAVAll.txt", {
      headers: { "User-Agent": "Mozilla/5.0 Folio/1.0" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return new Map();

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
    return latestNavs;
  } catch {
    return new Map();
  }
}

async function getNavHistory(schemeCode: number): Promise<NavPoint[]> {
  try {
    const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as MfApiResponse;
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function enrichFund(fund: Fund, officialLatest?: LatestFundNav): Promise<Holding> {
  const history = await getNavHistory(fund.scheme_code);
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
    result?: Array<{ meta?: { regularMarketPrice?: number; regularMarketTime?: number } }>;
  };
};

async function getEtfQuote(symbol: string) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.NS?range=1d&interval=5m`,
      {
        headers: { "User-Agent": "Mozilla/5.0 Folio/1.0" },
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(6000),
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as YahooChartResponse;
    const meta = payload.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    return { price: meta.regularMarketPrice, timestamp: meta.regularMarketTime ?? null };
  } catch {
    return null;
  }
}

export async function enrichEtf(etf: Etf): Promise<Holding> {
  const quote = await getEtfQuote(etf.symbol);
  const price = quote?.price ?? etf.last_price ?? etf.avg_price;
  const currentValue = price * etf.quantity;
  const gain = currentValue - etf.invested_amount;
  const quoteTime = quote?.timestamp
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(quote.timestamp * 1000))
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

export async function getPortfolioSeries(
  funds: Fund[],
  etfs: Etf[],
  latestFundNavs: ReadonlyMap<number, LatestFundNav> = new Map(),
): Promise<PortfolioPoint[]> {
  const histories = await Promise.all(funds.map(async (fund) => ({ fund, history: await getNavHistory(fund.scheme_code) })));
  const datedHistories = histories.map(({ fund, history }) => {
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
  const dates = [...new Set(datedHistories.flatMap(({ chronological }) => chronological.map((point) => point.date)))].sort();
  const etfInvested = etfs.reduce((sum, etf) => sum + etf.invested_amount, 0);
  const etfCurrent = etfs.reduce((sum, etf) => sum + (etf.last_price ?? etf.avg_price) * etf.quantity, 0);

  if (dates.length < 2) {
    const invested = funds.reduce((sum, fund) => sum + fund.invested_amount, 0) + etfInvested;
    const currentFunds = datedHistories.reduce((sum, item) => {
      const latest = item.chronological.at(-1)?.nav;
      return sum + (latest && item.units ? latest * item.units : item.fund.invested_amount);
    }, 0);
    return [
      { date: "2026-08-04", label: "4 Aug", value: invested },
      { date: new Date().toISOString().slice(0, 10), label: "Latest", value: currentFunds + etfCurrent },
    ];
  }

  return dates.map((date, index) => {
    const fundValue = datedHistories.reduce((sum, item) => {
      const point = [...item.chronological].reverse().find((candidate) => candidate.date <= date);
      return sum + (point && item.units ? point.nav * item.units : item.fund.invested_amount);
    }, 0);
    const etfProgress = dates.length > 1 ? index / (dates.length - 1) : 1;
    const etfValue = etfInvested + (etfCurrent - etfInvested) * etfProgress;
    return {
      date,
      label: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`)),
      value: fundValue + etfValue,
    };
  });
}

export function getDailyMovement(series: PortfolioPoint[]): DailyMovement[] {
  return series.slice(1).map((point, index) => {
    const previous = series[index].value;
    const change = previous ? ((point.value - previous) / previous) * 100 : 0;
    return { date: point.date, change: Math.abs(change) < 0.005 ? 0 : change };
  });
}
