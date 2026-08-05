"use client";

import { useMemo, useState } from "react";
import { Calculator, TrendingUp } from "lucide-react";
import { compactInr, inr } from "@/lib/format";

export function PlanningTools({ current }: { current: number }) {
  const [monthly, setMonthly] = useState(10000);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(12);
  const projection = useMemo(() => {
    const months = years * 12;
    const monthlyRate = rate / 1200;
    const existing = current * Math.pow(1 + monthlyRate, months);
    const sip = monthlyRate ? monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate) : monthly * months;
    const total = existing + sip;
    const contributed = current + monthly * months;
    return { total, contributed, growth: total - contributed };
  }, [current, monthly, rate, years]);

  return (
    <section className="planner-section" id="planner">
      <div className="planner-copy"><div className="feature-icon"><Calculator size={18}/></div><p className="eyebrow">WEALTH PROJECTOR</p><h2>See where consistency could take you.</h2><p>Adjust the assumptions to explore a hypothetical future value. This is a projection, not a guaranteed return.</p></div>
      <div className="planner-controls">
        <label><span>Monthly investment<strong>{inr.format(monthly)}</strong></span><input type="range" min="1000" max="100000" step="1000" value={monthly} onChange={(event) => setMonthly(Number(event.target.value))}/></label>
        <label><span>Time horizon<strong>{years} years</strong></span><input type="range" min="1" max="30" value={years} onChange={(event) => setYears(Number(event.target.value))}/></label>
        <label><span>Expected return<strong>{rate}% p.a.</strong></span><input type="range" min="1" max="20" step="0.5" value={rate} onChange={(event) => setRate(Number(event.target.value))}/></label>
      </div>
      <div className="projection-result"><span><TrendingUp size={15}/> Projected value</span><strong>{compactInr.format(projection.total)}</strong><div><p><small>Total contribution</small>{compactInr.format(projection.contributed)}</p><p><small>Potential growth</small>{compactInr.format(projection.growth)}</p></div></div>
    </section>
  );
}
