"use client";

import { useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { useFormStatus } from "react-dom";
import { addFund } from "@/app/actions";
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

export function AddFund() {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button className="primary-button" onClick={() => dialog.current?.showModal()}><Plus size={17} /> Add investment</button>
      <dialog ref={dialog} className="fund-dialog">
        <div className="dialog-title"><div><p className="eyebrow">NEW HOLDING</p><h2>Add an investment</h2></div><button aria-label="Close" onClick={() => dialog.current?.close()}><X /></button></div>
        <form action={addFund} className="fund-form">
          <CloseOnSuccess dialogRef={dialog} />
          <label className="wide">Full scheme name<input name="name" placeholder="e.g. Parag Parikh Flexi Cap Fund Direct Growth" required /></label>
          <label>Display name<input name="short_name" placeholder="Parag Parikh Flexi Cap" required /></label>
          <label>Category<select name="category" required><option>Large Cap</option><option>Mid Cap</option><option>Small Cap</option><option>Flexi Cap</option><option>Index</option><option>Debt</option><option>Hybrid</option><option>Other</option></select></label>
          <label>AMFI scheme code<input name="scheme_code" inputMode="numeric" placeholder="120586" required /></label>
          <label>Purchase date<input name="purchase_date" type="date" required /></label>
          <label>Amount invested<input name="invested_amount" type="number" min="1" step="0.01" placeholder="25000" required /></label>
          <label>Units <span>(optional)</span><input name="units" type="number" min="0" step="0.0001" placeholder="Auto-estimated" /></label>
          <label>Purchase NAV <span>(optional)</span><input name="purchase_nav" type="number" min="0" step="0.0001" placeholder="Auto-estimated" /></label>
          <div className="dialog-actions wide"><button type="button" className="secondary-button" onClick={() => dialog.current?.close()}>Cancel</button><SubmitButton className="primary-button" pendingLabel="Saving...">Save investment</SubmitButton></div>
        </form>
      </dialog>
    </>
  );
}
