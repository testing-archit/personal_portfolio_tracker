import type { Fund, Holding, NavPoint } from "@/lib/types";

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
    ...fund,
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
