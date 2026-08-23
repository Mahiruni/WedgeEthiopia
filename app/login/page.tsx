import Link from "next/link";
import { demoModeEnabled } from "@/src/lib/demo-mode";

export default function LoginPage() {
  const demo = demoModeEnabled();

  if (demo) {
    return <main className="login-page"><section className="login-card">
      <div className="brand" style={{marginBottom:24}}><span className="brand-mark">WE</span><span>Wedge Ethiopia</span></div>
      <h1 className="page-title">Demo workspace</h1>
      <p className="page-sub" style={{marginBottom:22}}>Supabase sign-in is temporarily disabled. Enter the workspace using synthetic tenant data.</p>
      <div className="callout" style={{marginBottom:16}}><strong>Temporary mode:</strong> no Supabase account is required and no live taxpayer data is loaded.</div>
      <Link className="btn btn-primary" href="/">Enter workspace</Link>
    </section></main>;
  }

  return <main className="login-page"><section className="login-card">
    <div className="brand" style={{marginBottom:24}}><span className="brand-mark">WE</span><span>Wedge Ethiopia</span></div>
    <h1 className="page-title">Operations access</h1>
    <p className="page-sub">Supabase authentication is enabled. Restore the interactive sign-in form before switching demo mode off.</p>
  </section></main>;
}
