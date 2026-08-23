"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";

export default function LoginPage() {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const supabase=createClient();
      const result=await supabase.auth.signInWithPassword({email,password});
      if(result.error) throw result.error;
      window.location.assign("/");
    } catch (err) { setError(err instanceof Error ? err.message : "Sign in failed"); }
    finally { setBusy(false); }
  }
  return <main className="login-page"><section className="login-card">
    <div className="brand" style={{marginBottom:24}}><span className="brand-mark">WE</span><span>Wedge Ethiopia</span></div>
    <h1 className="page-title">Operations access</h1>
    <p className="page-sub" style={{marginBottom:22}}>Sign in with the account assigned to your tenant. ERP clients use API keys instead.</p>
    <form onSubmit={submit} style={{display:"grid",gap:14}}>
      <label><span className="label">Email</span><input className="input" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label><span className="label">Password</span><input className="input" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
      {error ? <div className="callout" role="alert">{error}</div> : null}
      <button className="btn btn-primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  </section></main>;
}
