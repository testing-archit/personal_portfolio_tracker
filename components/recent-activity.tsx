import { CircleDollarSign, Landmark, RefreshCw } from "lucide-react";
import { inr } from "@/lib/format";
import type { Holding } from "@/lib/types";

export function RecentActivity({ holdings }: { holdings: Holding[] }) {
  const etf = holdings.find((holding) => holding.instrumentType === "etf");
  const largest = [...holdings].sort((a, b) => b.invested_amount - a.invested_amount)[0];
  return (
    <section className="activity-panel">
      <div className="section-head compact"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Portfolio timeline</h2></div><span>Auto-generated</span></div>
      <div className="activity-list">
        <div><i><RefreshCw/></i><p><strong>Prices refreshed</strong><small>Latest available NAV and ETF quote applied.</small></p><time>Today</time></div>
        {etf ? <div><i><Landmark/></i><p><strong>{etf.short_name} added</strong><small>{etf.effectiveUnits} units at an average of {inr.format(etf.effectivePurchaseNav ?? 0)}.</small></p><time>ETF</time></div> : null}
        {largest ? <div><i><CircleDollarSign/></i><p><strong>Largest investment tracked</strong><small>{largest.short_name} · {inr.format(largest.invested_amount)} invested.</small></p><time>Portfolio</time></div> : null}
      </div>
    </section>
  );
}
