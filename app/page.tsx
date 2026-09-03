import { AlertTriangle, ArrowDownRight, ArrowUpRight, Clock3, LogOut, RefreshCw, Sparkles, WalletCards } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { enrichEtf, enrichFund, getDailyMovement, getPortfolioSeries, loadMarketData } from "@/lib/nav";
import type { Etf, Fund } from "@/lib/types";
import { compactInr, friendlyDate, inr } from "@/lib/format";
import { AddHolding } from "@/components/add-holding";
import { AllocationRing } from "@/components/allocation-ring";
import { HoldingsTable } from "@/components/holdings-table";
import { MovementCalendar } from "@/components/movement-calendar";
import { PortfolioChart } from "@/components/portfolio-chart";
import { PortfolioInsights } from "@/components/portfolio-insights";
import { PlanningTools } from "@/components/planning-tools";
import { RecentActivity } from "@/components/recent-activity";
import { PortfolioControls } from "@/components/portfolio-controls";
import { RebalancingLab } from "@/components/rebalancing-lab";
import { ReturnAttribution } from "@/components/return-attribution";
import { SubmitButton } from "@/components/submit-button";
import { logout, seedPortfolio } from "./actions";

export const dynamic = "force-dynamic";
// The AMFI feed alone can take up to 2×12s with the retry in lib/nav.ts; without this,
// Vercel's default function timeout can kill the request before that retry gets to run.
export const maxDuration = 30;
// All the market-data fetches (AMFI, mfapi.in, Yahoo Finance for NSE) are India-hosted.
// Left on Vercel's default US region, every request crosses the Atlantic round-trip,
// which is most of why the AMFI feed specifically was timing out in production.
export const preferredRegion = "bom1";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: fundData, error: fundsError }, { data: etfData, error: etfsError }] = await Promise.all([
    supabase.from("funds").select("*").order("invested_amount", { ascending: false }),
    supabase.from("etfs").select("*").order("invested_amount", { ascending: false }),
  ]);
  const loadError = fundsError ?? etfsError;
  const name = user?.email?.split("@")[0] ?? "Investor";

  // A failed query must never render as "no holdings yet" — that state offers a
  // "Load my 4 purchases" seed button, which would look like a safe retry but is
  // actually destructive for an account that has real data the query just failed to fetch.
  if (loadError) {
    return (
      <main className="dashboard-shell">
        <header className="topbar">
          <a className="brand" href="#"><span>F</span>folio</a>
          <div className="top-actions"><form action={logout}><SubmitButton className="icon-button" aria-label="Sign out"><LogOut size={18}/></SubmitButton></form></div>
        </header>
        <section className="dashboard-content">
          <section className="empty-state">
            <div className="empty-icon error"><AlertTriangle/></div>
            <p className="eyebrow">CONNECTION ISSUE</p>
            <h2>Couldn't load your portfolio</h2>
            <p>We couldn&apos;t reach the database just now. Your data is safe — this is a connection hiccup, not data loss. Refresh in a moment to try again.</p>
          </section>
        </section>
      </main>
    );
  }

  const funds = (fundData ?? []) as Fund[];
  const etfs = (etfData ?? []) as Etf[];
  const { latestFundNavs, fundHistories, etfSnapshots } = await loadMarketData(funds, etfs);
  const holdings = [
    ...funds.map((fund) => enrichFund(fund, fundHistories.get(fund.scheme_code) ?? [], latestFundNavs.get(fund.scheme_code))),
    ...etfs.map((etf) => enrichEtf(etf, etfSnapshots.get(etf.symbol))),
  ];
  const portfolioSeries = getPortfolioSeries(funds, etfs, fundHistories, etfSnapshots, latestFundNavs);
  const dailyMovement = getDailyMovement(portfolioSeries);
  const invested = holdings.reduce((sum, item) => sum + item.invested_amount, 0);
  const current = holdings.reduce((sum, item) => sum + item.currentValue, 0);
  const gain = current - invested;
  const gainPct = invested ? (gain / invested) * 100 : 0;
  const freshestIsoDate = holdings.reduce<string | null>(
    (max, item) => (item.currentNavIsoDate && (!max || item.currentNavIsoDate > max) ? item.currentNavIsoDate : max),
    null,
  );
  const latestDate = freshestIsoDate ? friendlyDate(freshestIsoDate) : undefined;
  const earliestPurchaseDate = funds.reduce<string | null>(
    (min, fund) => (!min || fund.purchase_date < min ? fund.purchase_date : min),
    null,
  );

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <a className="brand" href="#"><span>F</span>folio</a>
        <nav><a className="active" href="#overview">Overview</a><a href="#holdings">Holdings</a><a href="#insights">Insights</a><a href="#analytics">Analytics</a><a href="#planner">Planner</a></nav>
        <div className="top-actions"><PortfolioControls/><AddHolding /><form action={logout}><SubmitButton className="icon-button" aria-label="Sign out"><LogOut size={18}/></SubmitButton></form><div className="avatar">{name.slice(0, 1).toUpperCase()}</div></div>
      </header>
      <section className="dashboard-content" id="overview">
        <div className="welcome-row"><div><p className="eyebrow">GOOD MORNING, {name.toUpperCase()}</p><h1>Your money, at a glance.</h1></div><div className="nav-status"><RefreshCw size={14}/><span>Latest prices</span><strong>{latestDate ?? "Waiting for data"}</strong></div></div>
        {holdings.length === 0 ? (
          <section className="empty-state"><div className="empty-icon"><WalletCards /></div><p className="eyebrow">READY WHEN YOU ARE</p><h2>Bring in your first investments</h2><p>I’ve already mapped the four funds from your screenshot to their AMFI scheme codes.</p><form action={seedPortfolio}><SubmitButton className="primary-button" pendingLabel="Loading..."><Sparkles size={17}/> Load my 4 purchases</SubmitButton></form></section>
        ) : (
          <>
            <section className="metric-grid">
              <article className="metric hero-metric"><p>Current value</p><strong>{inr.format(current)}</strong><div className={gain >= 0 ? "gain-pill" : "gain-pill loss"}>{gain >= 0 ? <ArrowUpRight/> : <ArrowDownRight/>}{gainPct >= 0 ? "+" : ""}{gainPct.toFixed(2)}%</div><small>All your holdings combined</small></article>
              <article className="metric"><p>Total invested</p><strong>{inr.format(invested)}</strong><small>Across {holdings.length} funds and ETFs</small></article>
              <article className="metric"><p>Total returns</p><strong className={gain >= 0 ? "positive" : "negative"}>{gain >= 0 ? "+" : ""}{inr.format(gain)}</strong><small>{earliestPurchaseDate ? `Since ${friendlyDate(earliestPurchaseDate)}` : "Since first purchase"}</small></article>
              <article className="metric"><p>Best performer</p><strong className="fund-winner">{[...holdings].sort((a,b) => b.gainPercent-a.gainPercent)[0]?.short_name}</strong><small className="positive">{Math.max(...holdings.map(h => h.gainPercent)).toFixed(2)}% return</small></article>
            </section>
            <article className="panel chart-panel full-panel"><div className="panel-head"><div><p className="eyebrow">PORTFOLIO MOVEMENT</p><h2>{compactInr.format(current)}</h2></div><span className="live-chip"><i/> Interactive history</span></div><PortfolioChart series={portfolioSeries} invested={invested} current={current}/></article>
            <section id="holdings" className="holdings-section"><div className="section-head"><div><p className="eyebrow">YOUR PORTFOLIO</p><h2>Holdings</h2></div><div className="estimate-key"><Clock3 size={14}/> Fund estimates use purchase-date NAV; ETF quotes refresh during market hours.</div></div><HoldingsTable holdings={holdings}/></section>
            <article className="panel allocation-panel full-panel"><div className="panel-head"><div><p className="eyebrow">ALLOCATION</p><h2>By category</h2></div></div><AllocationRing holdings={holdings}/></article>
            <MovementCalendar movements={dailyMovement}/>
            <PortfolioInsights holdings={holdings} current={current}/>
            <section className="analytics-grid"><RebalancingLab holdings={holdings} current={current}/><ReturnAttribution holdings={holdings}/></section>
            <section className="tools-grid"><PlanningTools current={current}/><RecentActivity holdings={holdings}/></section>
          </>
        )}
      </section>
      <footer><span>Folio is for tracking only, not investment advice.</span><span>Fund NAVs refresh daily; market quotes may be delayed.</span></footer>
    </main>
  );
}
