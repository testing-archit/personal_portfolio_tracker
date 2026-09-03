export type Fund = {
  id: string;
  user_id: string;
  scheme_code: number;
  name: string;
  short_name: string;
  category: string;
  invested_amount: number;
  purchase_date: string;
  units: number | null;
  purchase_nav: number | null;
};

export type NavPoint = { date: string; nav: string };
export type PortfolioPoint = { date: string; label: string; value: number };
export type DailyMovement = { date: string; change: number };

export type Etf = {
  id: string;
  user_id: string;
  symbol: string;
  exchange: string;
  name: string;
  short_name: string;
  category: string;
  quantity: number;
  avg_price: number;
  invested_amount: number;
  last_price: number | null;
  last_price_at: string | null;
};

export type Holding = {
  id: string;
  user_id: string;
  instrumentType: "mutual_fund" | "etf";
  symbol: string | null;
  name: string;
  short_name: string;
  category: string;
  invested_amount: number;
  purchase_date: string | null;
  units: number | null;
  purchase_nav: number | null;
  currentNav: number | null;
  currentNavDate: string | null;
  currentNavIsoDate: string | null;
  effectiveUnits: number | null;
  effectivePurchaseNav: number | null;
  currentValue: number;
  gain: number;
  gainPercent: number;
  isEstimated: boolean;
};
