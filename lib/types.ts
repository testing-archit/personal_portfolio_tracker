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

export type Holding = Fund & {
  currentNav: number | null;
  currentNavDate: string | null;
  effectiveUnits: number | null;
  effectivePurchaseNav: number | null;
  currentValue: number;
  gain: number;
  gainPercent: number;
  isEstimated: boolean;
};
