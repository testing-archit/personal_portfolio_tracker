import type { Holding } from "@/lib/types";
import { compactInr } from "@/lib/format";

const colors = ["#d6fb5c", "#5b7cff", "#a68bfa", "#56c9ae", "#ff9f66", "#ef6f9a", "#6dd0ed"];

export function AllocationRing({ holdings }: { holdings: Holding[] }) {
  const total = holdings.reduce((sum, fund) => sum + fund.currentValue, 0);
  const stops = holdings.map((fund, index) => {
    const start = total
      ? holdings.slice(0, index).reduce((sum, item) => sum + item.currentValue, 0) / total * 100
      : 0;
    const end = total ? start + (fund.currentValue / total) * 100 : 0;
    return `${colors[index % colors.length]} ${start}% ${end}%`;
  });
  return (
    <div className="allocation-layout">
      <div className="donut" style={{ background: `conic-gradient(${stops.join(",")})` }}><div><span>Current value</span><strong>{compactInr.format(total)}</strong></div></div>
      <div className="allocation-list">
        {holdings.map((fund, index) => <div key={fund.id}><i style={{ background: colors[index % colors.length] }} /><span>{fund.category}</span><strong>{total ? ((fund.currentValue / total) * 100).toFixed(0) : 0}%</strong></div>)}
      </div>
    </div>
  );
}
