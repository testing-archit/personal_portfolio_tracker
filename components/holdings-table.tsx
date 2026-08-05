import { MoreHorizontal, Save, Trash2 } from "lucide-react";
import { deleteHolding, updateAllotment } from "@/app/actions";
import { friendlyDate, inr } from "@/lib/format";
import type { Holding } from "@/lib/types";

export function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  return (
    <div className="table-shell">
      <table>
        <thead><tr><th>Holding</th><th>Invested</th><th>Current value</th><th>Returns</th><th>NAV / Price</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{holdings.map((fund) => (
          <tr key={fund.id}>
            <td><div className="fund-name"><span>{fund.short_name.slice(0, 2).toUpperCase()}</span><div><strong>{fund.short_name}</strong><small>{fund.instrumentType === "etf" ? `${fund.category} · ${fund.effectiveUnits} units · Avg. ${inr.format(fund.effectivePurchaseNav ?? 0)}` : `${fund.category} · ${friendlyDate(fund.purchase_date!)}`}</small></div></div></td>
            <td>{inr.format(fund.invested_amount)}</td>
            <td><strong>{inr.format(fund.currentValue)}</strong>{fund.isEstimated ? <small className="estimate">Estimated</small> : null}</td>
            <td className={fund.gain >= 0 ? "positive" : "negative"}><strong>{fund.gain >= 0 ? "+" : ""}{inr.format(fund.gain)}</strong><small>{fund.gainPercent >= 0 ? "+" : ""}{fund.gainPercent.toFixed(2)}%</small></td>
            <td><strong>{fund.currentNav ? inr.format(fund.currentNav) : "—"}</strong><small>{fund.currentNavDate ?? "Unavailable"}</small></td>
            <td><details className="row-menu"><summary aria-label="More actions"><MoreHorizontal /></summary><div className="row-popover">{fund.instrumentType === "mutual_fund" ? <><p>Add exact allotment</p><form action={updateAllotment} className="allotment-form"><input type="hidden" name="id" value={fund.id}/><label>Units<input name="units" type="number" min="0" step="0.000001" defaultValue={fund.units ?? undefined} placeholder={fund.effectiveUnits?.toFixed(4)} required/></label><label>Purchase NAV<input name="purchase_nav" type="number" min="0" step="0.0001" defaultValue={fund.purchase_nav ?? undefined} placeholder={fund.effectivePurchaseNav?.toFixed(4)} required/></label><button className="save-action"><Save size={14}/> Save exact values</button></form></> : <p>ETF holding</p>}<form action={deleteHolding.bind(null, fund.id, fund.instrumentType)}><button className="delete-action"><Trash2 size={14}/> Remove holding</button></form></div></details></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
