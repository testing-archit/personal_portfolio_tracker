import { AlertTriangle, CheckCircle2, Layers3, Sparkles, Target } from "lucide-react";
import { compactInr, inr } from "@/lib/format";
import type { Holding } from "@/lib/types";

export function PortfolioInsights({ holdings, current }: { holdings: Holding[]; current: number }) {
  const categories = new Set(holdings.map((holding) => holding.category));
  const topHolding = [...holdings].sort((a, b) => b.currentValue - a.currentValue)[0];
  const topWeight = current && topHolding ? (topHolding.currentValue / current) * 100 : 0;
  const etfValue = holdings.filter((holding) => holding.instrumentType === "etf").reduce((sum, holding) => sum + holding.currentValue, 0);
  const fundValue = current - etfValue;
  const diversificationScore = Math.max(1, Math.min(100, Math.round(categories.size * 17 + holdings.length * 5 - Math.max(0, topWeight - 30) * 0.7)));
  const nextGoal = Math.max(100000, Math.ceil((current + 1) / 100000) * 100000);
  const goalProgress = Math.min(100, (current / nextGoal) * 100);

  return (
    <section className="feature-grid" id="insights">
      <article className="feature-card goal-card">
        <div className="feature-icon"><Target size={18}/></div>
        <p className="eyebrow light">NEXT MILESTONE</p>
        <h2>{compactInr.format(nextGoal)}</h2>
        <p>{inr.format(Math.max(0, nextGoal - current))} to go</p>
        <div className="goal-track"><i style={{ width: `${goalProgress}%` }}/></div>
        <small>{goalProgress.toFixed(0)}% complete</small>
      </article>

      <article className="feature-card score-card">
        <div className="score-ring" style={{ "--score": `${diversificationScore * 3.6}deg` } as React.CSSProperties}><div><strong>{diversificationScore}</strong><span>/100</span></div></div>
        <div><p className="eyebrow">PORTFOLIO BALANCE</p><h2>{diversificationScore >= 70 ? "Well spread" : diversificationScore >= 45 ? "Getting balanced" : "Needs balance"}</h2><p>Across {categories.size} categories and {holdings.length} holdings.</p></div>
      </article>

      <article className="feature-card insight-card">
        <div className="feature-title"><div className="feature-icon pale"><Sparkles size={17}/></div><div><p className="eyebrow">SMART INSIGHTS</p><h2>Portfolio check-up</h2></div></div>
        <div className="insight-list">
          <div><span className={topWeight > 40 ? "warning-icon" : "ok-icon"}>{topWeight > 40 ? <AlertTriangle/> : <CheckCircle2/>}</span><p><strong>Largest position</strong><small>{topHolding?.short_name} is {topWeight.toFixed(0)}% of your portfolio.</small></p></div>
          <div><span className="ok-icon"><Layers3/></span><p><strong>Asset mix</strong><small>{compactInr.format(fundValue)} in funds · {compactInr.format(etfValue)} in ETFs.</small></p></div>
        </div>
      </article>
    </section>
  );
}
