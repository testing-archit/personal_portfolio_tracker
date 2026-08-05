"use client";

import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
};

export function SubmitButton({ children, pendingLabel, disabled, ...rest }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} aria-busy={pending} {...rest}>
      {pending ? (
        <>
          <Loader2 size={16} className="spin" />
          {pendingLabel ? ` ${pendingLabel}` : null}
        </>
      ) : (
        children
      )}
    </button>
  );
}
