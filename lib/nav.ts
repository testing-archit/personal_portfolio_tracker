import type { DailyMovement, Etf, Fund, Holding, NavPoint, PortfolioPoint } from "@/lib/types";

type MfApiResponse = {
  data?: NavPoint[];
};

function apiDateToIso(value: string) {
  const [day, month, year] = value.split("-");
  return `${year}-${month}-${day}`;
}

async function getNavHistory(schemeCode: number): Promise<NavPoint[]> {
  try {
    const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as MfApiResponse;
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function enrichFund(fund: Fund): Promise<Holding> {
  const history = await getNavHistory(fund.scheme_code);
  const latest = history[0];
  const purchasePoint = history
    .slice()
    .reverse()
    .find((point) => apiDateToIso(point.date) >= fund.purchase_date);
  const currentNav = latest ? Number(latest.nav) : null;
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
    currentNavDate: latest?.date ?? null,
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
        next: { revalidate: 300 },
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

export async function getPortfolioSeries(funds: Fund[], etfs: Etf[]): Promise<PortfolioPoint[]> {
  const histories = await Promise.all(funds.map(async (fund) => ({ fund, history: await getNavHistory(fund.scheme_code) })));
  const datedHistories = histories.map(({ fund, history }) => {
    const chronological = history
      .map((point) => ({ date: apiDateToIso(point.date), nav: Number(point.nav) }))
      .filter((point) => point.date >= fund.purchase_date && Number.isFinite(point.nav))
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
    return { date: point.date, change: previous ? ((point.value - previous) / previous) * 100 : 0 };
  });
}
