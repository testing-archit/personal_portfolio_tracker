"use client";

import { useMemo, useState } from "react";
import { inr } from "@/lib/format";
import type { PortfolioPoint } from "@/lib/types";

type Range = "1W" | "1M" | "ALL";

export function PortfolioChart({ series, invested, current }: { series: PortfolioPoint[]; invested: number; current: number }) {
  const [range, setRange] = useState<Range>("ALL");
  const [hovered, setHovered] = useState<number | null>(null);
  const points = useMemo(() => {
    if (range === "1W") return series.slice(-7);
    if (range === "1M") return series.slice(-30);
    return series;
  }, [range, series]);
  const width = 720;
  const height = 184;
  const pad = 10;
  const values = points.map((point) => point.value);
  const min = Math.min(...values, invested) * 0.998;
  const max = Math.max(...values, current) * 1.002;
  const spread = Math.max(1, max - min);
  const coords = points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? width / 2 : pad + (index / (points.length - 1)) * (width - pad * 2),
    y: pad + ((max - point.value) / spread) * (height - pad * 2),
  }));
  const line = coords.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const area = coords.length ? `${line} L${coords.at(-1)!.x} ${height} L${coords[0].x} ${height} Z` : "";
  const active = hovered === null ? coords.at(-1) : coords[hovered];
  const gain = current - invested;

  function handleMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const nearest = coords.reduce((best, point, index) => Math.abs(point.x - x) < Math.abs(coords[best].x - x) ? index : best, 0);
    setHovered(nearest);
  }

  return (
    <div className="interactive-chart">
      <div className="chart-toolbar">
        <div><span className={gain >= 0 ? "positive" : "negative"}>{gain >= 0 ? "+" : ""}{inr.format(gain)}</span><small>portfolio gain</small></div>
        <div className="range-picker">{(["1W", "1M", "ALL"] as Range[]).map((item) => <button key={item} className={range === item ? "active" : ""} onClick={() => setRange(item)}>{item}</button>)}</div>
      </div>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Interactive portfolio value history" onPointerMove={handleMove} onPointerLeave={() => setHovered(null)}>
          <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d6fb5c" stopOpacity=".3"/><stop offset="1" stopColor="#d6fb5c" stopOpacity="0"/></linearGradient></defs>
          {[.25,.5,.75].map(position => <line key={position} x1="0" x2={width} y1={height * position} y2={height * position} className="gridline"/>)}
          <path d={area} fill="url(#chartFill)" className="chart-area"/>
          <path d={line} fill="none" stroke="#b9df28" strokeWidth="3" vectorEffect="non-scaling-stroke" className="chart-line"/>
          {active ? <><line x1={active.x} x2={active.x} y1="0" y2={height} className="hover-line"/><circle cx={active.x} cy={active.y} r="5" fill="#171a14" stroke="#d6fb5c" strokeWidth="3" vectorEffect="non-scaling-stroke"/></> : null}
        </svg>
        {active ? <div className="chart-tooltip" style={{ left: `${(active.x / width) * 100}%`, top: `${Math.max(2, (active.y / height) * 100 - 23)}%` }}><strong>{inr.format(active.value)}</strong><span>{active.label}</span></div> : null}
        <div className="chart-labels"><span>{coords[0]?.label ?? "Start"}</span><span>{coords.at(-1)?.label ?? "Latest"}</span></div>
      </div>
    </div>
  );
}
