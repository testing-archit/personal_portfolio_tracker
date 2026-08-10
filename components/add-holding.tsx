"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useFormStatus } from "react-dom";
import { addEtf, addFund } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

function CloseOnSuccess({ dialogRef }: { dialogRef: React.RefObject<HTMLDialogElement | null> }) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending) dialogRef.current?.close();
    wasPending.current = pending;
  }, [pending, dialogRef]);
  return null;
}

const CATEGORIES = ["Large Cap", "Mid Cap", "Small Cap", "Flexi Cap", "Index", "Debt", "Hybrid", "Other"];

export function AddHolding() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<"fund" | "etf">("fund");

  function close() {
    dialog.current?.close();
  }

  return (
    <>
      <button className="primary-button" onClick={() => dialog.current?.showModal()}><Plus size={17} /> Add investment</button>
      <dialog ref={dialog} className="fund-dialog">
        <div className="dialog-title"><div><p className="eyebrow">NEW HOLDING</p><h2>Add an investment</h2></div><button aria-label="Close" onClick={close}><X /></button></div>
        <div className="filter-tabs holding-type-tabs">
          <button type="button" className={type === "fund" ? "active" : ""} onClick={() => setType("fund")}>Mutual fund</button>
          <button type="button" className={type === "etf" ? "active" : ""} onClick={() => setType("etf")}>ETF</button>
        </div>
        {type === "fund" ? (
          <form action={addFund} className="fund-form">
            <CloseOnSuccess dialogRef={dialog} />
            <label className="wide">Full scheme name<input name="name" placeholder="e.g. Parag Parikh Flexi Cap Fund Direct Growth" required /></label>
            <label>Display name<input name="short_name" placeholder="Parag Parikh Flexi Cap" required /></label>
            <label>Category<select name="category" required>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>AMFI scheme code<input name="scheme_code" inputMode="numeric" placeholder="120586" required /></label>
            <label>Purchase date<input name="purchase_date" type="date" required /></label>
            <label>Amount invested<input name="invested_amount" type="number" min="1" step="0.01" placeholder="25000" required /></label>
            <label>Units <span>(optional)</span><input name="units" type="number" min="0" step="0.0001" placeholder="Auto-estimated" /></label>
            <label>Purchase NAV <span>(optional)</span><input name="purchase_nav" type="number" min="0" step="0.0001" placeholder="Auto-estimated" /></label>
            <div className="dialog-actions wide"><button type="button" className="secondary-button" onClick={close}>Cancel</button><SubmitButton className="primary-button" pendingLabel="Saving...">Save investment</SubmitButton></div>
          </form>
        ) : (
          <form action={addEtf} className="fund-form">
            <CloseOnSuccess dialogRef={dialog} />
            <label className="wide">Full name<input name="name" placeholder="e.g. Nippon India ETF Nifty BeES" required /></label>
            <label>Display name<input name="short_name" placeholder="Nifty BeES" required /></label>
            <label>Category<select name="category" required>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>NSE symbol<input name="symbol" placeholder="NIFTYBEES" required /></label>
            <label>Quantity<input name="quantity" type="number" min="0.000001" step="0.000001" placeholder="50" required /></label>
            <label>Average price<input name="avg_price" type="number" min="0.0001" step="0.0001" placeholder="245.50" required /></label>
            <label>Amount invested <span>(optional)</span><input name="invested_amount" type="number" min="0" step="0.01" placeholder="Auto: quantity × avg price" /></label>
            <div className="dialog-actions wide"><button type="button" className="secondary-button" onClick={close}>Cancel</button><SubmitButton className="primary-button" pendingLabel="Saving...">Save investment</SubmitButton></div>
          </form>
        )}
      </dialog>
    </>
  );
}
