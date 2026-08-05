import { ArrowDownRight, ArrowUpRight, Clock3, LogOut, RefreshCw, Sparkles, WalletCards } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { enrichEtf, enrichFund, getPortfolioSeries } from "@/lib/nav";
import type { Etf, Fund } from "@/lib/types";
import { compactInr, inr } from "@/lib/format";
import { AddFund } from "@/components/add-fund";
import { AllocationRing } from "@/components/allocation-ring";
import { HoldingsTable } from "@/components/holdings-table";
import { PortfolioChart } from "@/components/portfolio-chart";
import { PortfolioInsights } from "@/components/portfolio-insights";
import { PlanningTools } from "@/components/planning-tools";
import { RecentActivity } from "@/components/recent-activity";
import { logout, seedPortfolio } from "./actions";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: fundData }, { data: etfData }] = await Promise.all([
    supabase.from("funds").select("*").order("invested_amount", { ascending: false }),
    supabase.from("etfs").select("*").order("invested_amount", { ascending: false }),
  ]);
  const holdings = await Promise.all([
    ...((fundData ?? []) as Fund[]).map(enrichFund),
    ...((etfData ?? []) as Etf[]).map(enrichEtf),
  ]);
  const portfolioSeries = await getPortfolioSeries((fundData ?? []) as Fund[], (etfData ?? []) as Etf[]);
  const invested = holdings.reduce((sum, item) => sum + item.invested_amount, 0);
  const current = holdings.reduce((sum, item) => sum + item.currentValue, 0);
  const gain = current - invested;
  const gainPct = invested ? (gain / invested) * 100 : 0;
  const latestDate = holdings.find((item) => item.currentNavDate)?.currentNavDate;
  const name = user?.email?.split("@")[0] ?? "Investor";

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <a className="brand" href="#"><span>F</span>folio</a>
        <nav><a className="active" href="#overview">Overview</a><a href="#insights">Insights</a><a href="#planner">Planner</a><a href="#holdings">Holdings</a></nav>
        <div className="top-actions"><AddFund /><form action={logout}><button className="icon-button" aria-label="Sign out"><LogOut size={18}/></button></form><div className="avatar">{name.slice(0, 1).toUpperCase()}</div></div>
      </header>
      <section className="dashboard-content" id="overview">
        <div className="welcome-row"><div><p className="eyebrow">GOOD MORNING, {name.toUpperCase()}</p><h1>Your money, at a glance.</h1></div><div className="nav-status"><RefreshCw size={14}/><span>Latest prices</span><strong>{latestDate ?? "Waiting for data"}</strong></div></div>
        {holdings.length === 0 ? (
          <section className="empty-state"><div className="empty-icon"><WalletCards /></div><p className="eyebrow">READY WHEN YOU ARE</p><h2>Bring in your first investments</h2><p>I’ve already mapped the four funds from your screenshot to their AMFI scheme codes.</p><form action={seedPortfolio}><button className="primary-button"><Sparkles size={17}/> Load my 4 purchases</button></form></section>
        ) : (
          <>
            <section className="metric-grid">
              <article className="metric hero-metric"><p>Current value</p><strong>{inr.format(current)}</strong><div className={gain >= 0 ? "gain-pill" : "gain-pill loss"}>{gain >= 0 ? <ArrowUpRight/> : <ArrowDownRight/>}{gainPct >= 0 ? "+" : ""}{gainPct.toFixed(2)}%</div><small>All your holdings combined</small></article>
              <article className="metric"><p>Total invested</p><strong>{inr.format(invested)}</strong><small>Across {holdings.length} funds and ETFs</small></article>
              <article className="metric"><p>Total returns</p><strong className={gain >= 0 ? "positive" : "negative"}>{gain >= 0 ? "+" : ""}{inr.format(gain)}</strong><small>Since 4 Aug 2026</small></article>
              <article className="metric"><p>Best performer</p><strong className="fund-winner">{[...holdings].sort((a,b) => b.gainPercent-a.gainPercent)[0]?.short_name}</strong><small className="positive">{Math.max(...holdings.map(h => h.gainPercent)).toFixed(2)}% return</small></article>
            </section>
            <section className="insight-grid">
              <article className="panel chart-panel"><div className="panel-head"><div><p className="eyebrow">PORTFOLIO MOVEMENT</p><h2>{compactInr.format(current)}</h2></div><span className="live-chip"><i/> Interactive history</span></div><PortfolioChart series={portfolioSeries} invested={invested} current={current}/></article>
              <article className="panel allocation-panel"><div className="panel-head"><div><p className="eyebrow">ALLOCATION</p><h2>By category</h2></div></div><AllocationRing holdings={holdings}/></article>
            </section>
            <PortfolioInsights holdings={holdings} current={current}/>
            <section className="tools-grid"><PlanningTools current={current}/><RecentActivity holdings={holdings}/></section>
            <section id="holdings" className="holdings-section"><div className="section-head"><div><p className="eyebrow">YOUR PORTFOLIO</p><h2>Holdings</h2></div><div className="estimate-key"><Clock3 size={14}/> Fund estimates use purchase-date NAV; ETF quotes refresh during market hours.</div></div><HoldingsTable holdings={holdings}/></section>
          </>
        )}
      </section>
      <footer><span>Folio is for tracking only, not investment advice.</span><span>Fund NAVs refresh daily; market quotes may be delayed.</span></footer>
    </main>
  );
}
