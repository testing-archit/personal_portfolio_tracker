import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { inr } from "@/lib/format";
import type { Holding } from "@/lib/types";

export function ReturnAttribution({ holdings }: { holdings: Holding[] }) {
  const ordered = [...holdings].sort((a, b) => Math.abs(b.gain) - Math.abs(a.gain));
  const max = Math.max(1, ...ordered.map((holding) => Math.abs(holding.gain)));
  return (
    <article className="attribution-card">
      <div className="section-head compact"><div><p className="eyebrow">RETURN ATTRIBUTION</p><h2>What moved your portfolio</h2></div><span>Absolute contribution</span></div>
      <div className="attribution-list">
        {ordered.map((holding) => <div key={holding.id}>
          <div className="attribution-label"><span>{holding.short_name}</span><strong className={holding.gain >= 0 ? "positive" : "negative"}>{holding.gain >= 0 ? <ArrowUpRight/> : <ArrowDownRight/>}{holding.gain >= 0 ? "+" : ""}{inr.format(holding.gain)}</strong></div>
          <div className="attribution-track"><i className={holding.gain < 0 ? "loss" : ""} style={{ width: `${Math.max(2, Math.abs(holding.gain) / max * 100)}%` }}/></div>
        </div>)}
      </div>
    </article>
  );
}
