"use client";

import { useMemo, useState } from "react";
import { Download, MoreHorizontal, Save, Search, Trash2 } from "lucide-react";
import { deleteHolding, updateAllotment, updateEtfHolding } from "@/app/actions";
import { friendlyDate, inr } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";
import type { Holding } from "@/lib/types";

type Filter = "all" | "mutual_fund" | "etf";
type Sort = "value" | "return" | "name";

export function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("value");
  const visible = useMemo(() => holdings
    .filter((holding) => filter === "all" || holding.instrumentType === filter)
    .filter((holding) => `${holding.short_name} ${holding.category}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === "value" ? b.currentValue - a.currentValue : sort === "return" ? b.gainPercent - a.gainPercent : a.short_name.localeCompare(b.short_name)), [filter, holdings, query, sort]);

  function exportCsv() {
    const header = ["Holding", "Type", "Category", "Invested", "Current value", "Gain", "Return %", "Latest price"];
    const rows = holdings.map((holding) => [holding.short_name, holding.instrumentType, holding.category, holding.invested_amount, holding.currentValue.toFixed(2), holding.gain.toFixed(2), holding.gainPercent.toFixed(2), holding.currentNav ?? ""]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `folio-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="holdings-browser">
      <div className="holdings-toolbar">
        <label className="holding-search"><Search size={14}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search holdings" aria-label="Search holdings"/></label>
        <div className="filter-tabs">{(["all", "mutual_fund", "etf"] as Filter[]).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item === "all" ? "All" : item === "etf" ? "ETFs" : "Funds"}</button>)}</div>
        <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} aria-label="Sort holdings"><option value="value">Value: high to low</option><option value="return">Best return</option><option value="name">Name: A–Z</option></select>
        <button className="export-button" onClick={exportCsv}><Download size={14}/> Export CSV</button>
      </div>
      <div className="table-shell">
        <table>
          <thead><tr><th>Holding</th><th>Invested</th><th>Current value</th><th>Returns</th><th>NAV / Price</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{visible.map((fund) => (
            <tr key={fund.id}>
              <td><div className="fund-name"><span>{fund.short_name.slice(0, 2).toUpperCase()}</span><div><strong>{fund.short_name}</strong><small>{fund.instrumentType === "etf" ? `${fund.category} · ${fund.effectiveUnits} units · Avg. ${inr.format(fund.effectivePurchaseNav ?? 0)}` : `${fund.category} · ${friendlyDate(fund.purchase_date!)}`}</small></div></div></td>
              <td>{inr.format(fund.invested_amount)}</td>
              <td><strong>{inr.format(fund.currentValue)}</strong>{fund.isEstimated ? <small className="estimate">Estimated</small> : null}</td>
              <td className={fund.gain >= 0 ? "positive" : "negative"}><strong>{fund.gain >= 0 ? "+" : ""}{inr.format(fund.gain)}</strong><small>{fund.gainPercent >= 0 ? "+" : ""}{fund.gainPercent.toFixed(2)}%</small></td>
              <td><strong>{fund.currentNav ? inr.format(fund.currentNav) : "—"}</strong><small>{fund.currentNavDate ?? "Unavailable"}</small></td>
              <td><details className="row-menu"><summary aria-label="More actions"><MoreHorizontal /></summary><div className="row-popover">{fund.instrumentType === "mutual_fund" ? <><p>Add exact allotment</p><form action={updateAllotment} className="allotment-form"><input type="hidden" name="id" value={fund.id}/><label>Units<input name="units" type="number" min="0" step="0.000001" defaultValue={fund.units ?? undefined} placeholder={fund.effectiveUnits?.toFixed(4)} required/></label><label>Purchase NAV<input name="purchase_nav" type="number" min="0" step="0.0001" defaultValue={fund.purchase_nav ?? undefined} placeholder={fund.effectivePurchaseNav?.toFixed(4)} required/></label><SubmitButton className="save-action" pendingLabel="Saving..."><Save size={14}/> Save exact values</SubmitButton></form></> : <><p>Edit holding</p><form action={updateEtfHolding} className="allotment-form"><input type="hidden" name="id" value={fund.id}/><label>Quantity<input name="quantity" type="number" min="0" step="0.000001" defaultValue={fund.effectiveUnits ?? undefined} required/></label><label>Average price<input name="avg_price" type="number" min="0" step="0.0001" defaultValue={fund.effectivePurchaseNav ?? undefined} required/></label><SubmitButton className="save-action" pendingLabel="Saving..."><Save size={14}/> Save exact values</SubmitButton></form></>}<form action={deleteHolding.bind(null, fund.id, fund.instrumentType)}><SubmitButton className="delete-action" pendingLabel="Removing..."><Trash2 size={14}/> Remove holding</SubmitButton></form></div></details></td>
            </tr>
          ))}</tbody>
        </table>
        {visible.length === 0 ? <div className="no-results">No holdings match those filters.</div> : null}
      </div>
    </div>
  );
}
