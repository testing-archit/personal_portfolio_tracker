"use client";

import { useEffect, useState, useTransition } from "react";
import { Eye, EyeOff, Printer, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function PortfolioControls() {
  const router = useRouter();
  const [privateMode, setPrivateMode] = useState(false);
  const [refreshing, startRefresh] = useTransition();

  useEffect(() => {
    const enabled = localStorage.getItem("folio-private") === "true";
    document.body.classList.toggle("privacy-on", enabled);
    const frame = requestAnimationFrame(() => setPrivateMode(enabled));
    return () => cancelAnimationFrame(frame);
  }, []);

  function togglePrivacy() {
    const next = !privateMode;
    setPrivateMode(next);
    localStorage.setItem("folio-private", String(next));
    document.body.classList.toggle("privacy-on", next);
  }

  return (
    <div className="portfolio-controls">
      <button className={privateMode ? "icon-button control-active" : "icon-button"} onClick={togglePrivacy} aria-label={privateMode ? "Show portfolio values" : "Hide portfolio values"} title={privateMode ? "Show values" : "Privacy mode"}>{privateMode ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
      <button className="icon-button" onClick={() => startRefresh(() => router.refresh())} aria-label="Refresh prices" title="Refresh prices"><RefreshCw className={refreshing ? "spin" : ""} size={17}/></button>
      <button className="icon-button print-control" onClick={() => window.print()} aria-label="Print portfolio report" title="Print or save PDF"><Printer size={17}/></button>
    </div>
  );
}
