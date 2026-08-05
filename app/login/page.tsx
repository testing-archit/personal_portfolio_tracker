import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { login } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return (
    <main className="login-shell">
      <section className="login-story">
        <a className="brand brand-light" href="#"><span>F</span>folio</a>
        <div className="story-copy">
          <p className="eyebrow light">YOUR MONEY, MADE CLEAR</p>
          <h1>Know exactly<br />where you stand.</h1>
          <p>A private, focused view of your direct mutual funds—without noise, tips, or distractions.</p>
        </div>
        <div className="story-stat">
          <span>Latest NAV</span>
          <strong>Automatic daily refresh</strong>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-brand brand"><span>F</span>folio</div>
          <div className="lock-badge"><LockKeyhole size={20} /></div>
          <p className="eyebrow">PRIVATE PORTFOLIO</p>
          <h2>Welcome back</h2>
          <p className="muted">Sign in to see how your investments are doing.</p>
          {!configured ? (
            <div className="config-note">
              <strong>One-time setup needed</strong>
              <span>Add the two Supabase variables from <code>.env.example</code>.</span>
            </div>
          ) : null}
          <form action={login} className="login-form">
            <label>Email address<input name="email" type="email" placeholder="you@example.com" required autoComplete="email" /></label>
            <label>Password<input name="password" type="password" placeholder="••••••••" required autoComplete="current-password" /></label>
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" disabled={!configured}>Sign in <ArrowUpRight size={18} /></button>
          </form>
          <p className="security-note"><LockKeyhole size={13} /> Encrypted sign-in. Your data stays private.</p>
        </div>
      </section>
    </main>
  );
}
