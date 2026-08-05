"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Scale } from "lucide-react";
import { inr } from "@/lib/format";
import type { Holding } from "@/lib/types";

export function RebalancingLab({ holdings, current }: { holdings: Holding[]; current: number }) {
  const allocation = useMemo(() => holdings.reduce<Record<string, number>>((result, holding) => {
    result[holding.category] = (result[holding.category] ?? 0) + holding.currentValue;
    return result;
  }, {}), [holdings]);
  const currentTargets = useMemo(() => Object.fromEntries(Object.entries(allocation).map(([category, value]) => [category, Math.round(value / current * 100)])), [allocation, current]);
  const [targets, setTargets] = useState(currentTargets);
  const totalTarget = Object.values(targets).reduce((sum, value) => sum + value, 0);

  function equalWeight() {
    const categories = Object.keys(allocation);
    const base = Math.floor(100 / categories.length);
    setTargets(Object.fromEntries(categories.map((category, index) => [category, base + (index < 100 - base * categories.length ? 1 : 0)])));
  }

  return (
    <article className="rebalance-card" id="analytics">
      <div className="rebalance-head"><div className="feature-title"><div className="feature-icon pale"><Scale size={17}/></div><div><p className="eyebrow">REBALANCING LAB</p><h2>Test a target mix</h2></div></div><div className="rebalance-actions"><button onClick={equalWeight}>Equal weight</button><button onClick={() => setTargets(currentTargets)}><RotateCcw size={12}/> Reset</button></div></div>
      <p className="rebalance-intro">Move the targets to explore hypothetical adjustments. Nothing here places a trade.</p>
      <div className="target-total"><span>Target total</span><strong className={totalTarget === 100 ? "positive" : "negative"}>{totalTarget}%</strong></div>
      <div className="rebalance-list">
        {Object.entries(allocation).map(([category, value]) => {
          const targetAmount = totalTarget ? current * (targets[category] / totalTarget) : 0;
          const difference = targetAmount - value;
          return <label key={category}><span><strong>{category}</strong><small>Current {(value / current * 100).toFixed(0)}%</small></span><input type="range" min="0" max="60" value={targets[category]} onChange={(event) => setTargets((previous) => ({ ...previous, [category]: Number(event.target.value) }))}/><b>{targets[category]}%</b><em className={difference >= 0 ? "positive" : "negative"}>{difference >= 0 ? "Add " : "Reduce "}{inr.format(Math.abs(difference))}</em></label>;
        })}
      </div>
    </article>
  );
}
