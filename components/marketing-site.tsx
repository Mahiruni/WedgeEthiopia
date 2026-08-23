"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";

type IconName = "route" | "shield" | "ledger" | "webhook" | "identity" | "branch" | "arrow" | "check";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const paths: Record<IconName, ReactNode> = {
    route: <><path d="M5 5h7a4 4 0 0 1 4 4v10"/><path d="m13 16 3 3 3-3"/><circle cx="5" cy="5" r="2"/></>,
    shield: <><path d="M12 3 5.5 5.7v5.7c0 4.3 2.6 7.6 6.5 9.6 3.9-2 6.5-5.3 6.5-9.6V5.7L12 3Z"/><path d="m9.2 12 1.8 1.8 3.8-4"/></>,
    ledger: <><path d="M5 4.5h14v15H5z"/><path d="M8 8h8M8 12h8M8 16h4"/></>,
    webhook: <><path d="M8.5 7.5a4 4 0 1 1 7 2.7"/><path d="M15.5 16.5a4 4 0 1 1-7-2.7"/><path d="M8.2 12h7.6"/></>,
    identity: <><circle cx="12" cy="8" r="3"/><path d="M5.5 19c1.2-3.6 3.4-5.4 6.5-5.4S17.3 15.4 18.5 19"/></>,
    branch: <><circle cx="7" cy="5" r="2"/><circle cx="17" cy="19" r="2"/><circle cx="7" cy="19" r="2"/><path d="M7 7v5c0 2.2 1.8 4 4 4h4M7 12v5"/></>,
    arrow: <><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>,
    check: <path d="m5 12.5 4 4 10-10"/>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return <span className={`mkt-brand-mark${compact ? " compact" : ""}`} aria-hidden="true"><svg viewBox="0 0 34 34"><path d="M5 7h7l5 10 5-10h7L18 28h-2L5 7Z"/><path d="M12 7h5l2.6 5.2-2.7 5.3L12 7Z" className="cut"/></svg></span>;
}

function Magnetic({ href, children, className = "", onClick }: { href?: string; children: ReactNode; className?: string; onClick?: () => void }) {
  const ref = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  const move = (event: React.PointerEvent<HTMLElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.innerWidth < 900) return;
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (event.clientX - r.left - r.width / 2) * 0.13;
    const y = (event.clientY - r.top - r.height / 2) * 0.13;
    el.style.transform = `translate3d(${x}px,${y}px,0)`;
  };
  const leave = () => { if (ref.current) ref.current.style.transform = "translate3d(0,0,0)"; };
  if (href) return <Link ref={ref as React.RefObject<HTMLAnchorElement>} href={href} className={className} onPointerMove={move} onPointerLeave={leave}>{children}</Link>;
  return <button ref={ref as React.RefObject<HTMLButtonElement>} className={className} onPointerMove={move} onPointerLeave={leave} onClick={onClick}>{children}</button>;
}

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current; if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { node.dataset.visible = "true"; return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { node.dataset.visible = "true"; observer.disconnect(); } }, { threshold: 0.14 });
    observer.observe(node); return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`mkt-reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

function Counter({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current; if (!node) return;
    let raf = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }
      const start = performance.now(); const duration = 1100;
      const tick = (now: number) => { const p = Math.min(1, (now - start) / duration); const eased = 1 - Math.pow(1 - p, 3); setShown(Math.round(value * eased)); if (p < 1) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    }, { threshold: .6 });
    observer.observe(node); return () => { observer.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);
  return <span ref={ref}>{prefix}{shown.toLocaleString()}{suffix}</span>;
}

function Atmosphere() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0, height = 0, dpr = 1, raf = 0;
    const points = Array.from({ length: 34 }, (_, i) => ({ x: (i * 47 % 100) / 100, y: (i * 73 % 100) / 100, r: .5 + (i % 4) * .35, v: .000035 + (i % 5) * .000012 }));
    const resize = () => { const rect = canvas.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); width = rect.width; height = rect.height; canvas.width = Math.max(1, Math.floor(width * dpr)); canvas.height = Math.max(1, Math.floor(height * dpr)); ctx.setTransform(dpr,0,0,dpr,0,0); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(canvas);
    const draw = () => { ctx.clearRect(0,0,width,height); for (const p of points) { if (!reduced) p.y = (p.y - p.v + 1) % 1; ctx.beginPath(); ctx.arc(p.x * width, p.y * height, p.r, 0, Math.PI*2); ctx.fillStyle = "rgba(232, 190, 104, .32)"; ctx.fill(); } if (!reduced) raf = requestAnimationFrame(draw); };
    draw(); return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} className="mkt-atmosphere" aria-hidden="true"/>;
}

function ProductFrame() {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.innerWidth < 900) return;
    const el = ref.current; if (!el) return; const r = el.getBoundingClientRect(); const x = (e.clientX-r.left)/r.width-.5; const y=(e.clientY-r.top)/r.height-.5;
    el.style.setProperty("--rx", `${-y*3.5}deg`); el.style.setProperty("--ry", `${x*5}deg`);
  };
  const leave = () => { if (ref.current) { ref.current.style.setProperty("--rx", "0deg"); ref.current.style.setProperty("--ry", "0deg"); } };
  return <div ref={ref} className="mkt-product-stage" onPointerMove={move} onPointerLeave={leave}>
    <div className="mkt-product-window">
      <div className="mkt-window-top"><span/><span/><span/><div className="mkt-window-title">Wedge / Fiscal operations</div><div className="mkt-live"><i/> Live</div></div>
      <div className="mkt-window-body">
        <div className="mkt-mini-nav"><div className="mkt-mini-brand"><BrandMark compact/></div>{["Overview","Invoices","Reconcile","Audit","API"].map((x,i)=><div key={x} className={`mkt-mini-link${i===0?" active":""}`}>{x}</div>)}</div>
        <div className="mkt-window-main">
          <div className="mkt-frame-head"><div><span className="mkt-eyebrow">CLEARANCE HEALTH</span><strong>1,842 accepted today</strong></div><span className="mkt-status-pill"><i/>99.6% terminal success</span></div>
          <div className="mkt-frame-grid">
            <div className="mkt-flow-card">
              <div className="mkt-flow-title"><span>Invoice orchestration</span><b>ETB 48.37M</b></div>
              <div className="mkt-flow-line"><span className="done">ERP</span><i/><span className="done">Validated</span><i/><span className="hot">Authority</span><i/><span>Delivered</span></div>
              <div className="mkt-chart" aria-hidden="true"><svg viewBox="0 0 520 110" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e2b15c" stopOpacity=".28"/><stop offset="1" stopColor="#e2b15c" stopOpacity="0"/></linearGradient></defs><path d="M0 92 C42 91,49 68,89 74 S149 43,190 55 S255 27,300 45 S356 18,401 28 S457 16,520 9 L520 110 L0 110Z" fill="url(#g)"/><path d="M0 92 C42 91,49 68,89 74 S149 43,190 55 S255 27,300 45 S356 18,401 28 S457 16,520 9" fill="none" stroke="#e2b15c" strokeWidth="2"/></svg></div>
            </div>
            <div className="mkt-side-stack">
              <div className="mkt-small-card"><span className="mkt-eyebrow">AUDIT CHAIN</span><strong>Verified</strong><div className="mkt-hash">9f2a…e17c</div></div>
              <div className="mkt-small-card"><span className="mkt-eyebrow">ERP SOURCE</span><strong>Odoo · Addis HQ</strong><div className="mkt-soft">Last event 8s ago</div></div>
            </div>
          </div>
          <div className="mkt-ledger-row"><span>INV-10452</span><span>Aster Trading PLC</span><span>ETB 1,245,000</span><span className="mkt-status-pill"><i/>Accepted</span></div>
        </div>
      </div>
    </div>
    <div className="mkt-float-card card-a"><span className="mkt-eyebrow">SIGNED EVENT</span><strong>invoice.accepted</strong><small>Ed25519 · verified</small></div>
    <div className="mkt-float-card card-b"><span className="mkt-eyebrow">LEDGER</span><strong>Dr AR · Cr Revenue</strong><small>balanced automatically</small></div>
  </div>;
}

const featureData = [
  { key: "orchestration", label: "Fiscal orchestration", title: "One deterministic path from ERP event to accepted invoice.", body: "Validate payloads, enforce invoice state transitions, retry safely, preserve authority references, and keep correction flows explicit instead of burying them in support tickets.", icon: "route" as IconName, stat: "8 states", meta: "Draft → validated → submitted → accepted" },
  { key: "connectivity", label: "ERP connectivity", title: "Give every business system the same fiscal contract.", body: "A canonical invoice schema, idempotent API, webhooks, and adapter boundary let Odoo, ERPNext, POS systems, and custom ERPs integrate without learning each downstream protocol.", icon: "webhook" as IconName, stat: "1 API", meta: "REST + signed webhooks + stable errors" },
  { key: "audit", label: "Audit + ledger", title: "Explain every number and every state change later.", body: "Append-only audit events and double-entry journals keep operational history traceable. Corrections reverse and reference prior entries rather than silently rewriting the past.", icon: "ledger" as IconName, stat: "100%", meta: "append-only fiscal history" },
  { key: "identity", label: "Identity + authority", title: "Separate who a person is from what they may do for a company.", body: "Identity bindings and signatory authority are modeled independently, ready for stronger verification when the official relying-party requirements are connected.", icon: "identity" as IconName, stat: "2 layers", meta: "human identity + company authority" },
];

const faq = [
  ["Is Wedge already an accredited fiscal provider?", "No. The current product is an integration and workflow layer with a regulator adapter boundary. Production claims will only be enabled after the official authority contract and accreditation route are verified."],
  ["Can we connect an existing ERP?", "Yes. The V1 contract is designed around ERP/POS ingestion, idempotent invoice creation, validation, status retrieval, signed event delivery, and exportable audit history."],
  ["Where does the data live?", "The production architecture is designed to support Ethiopia-hosted regulated workloads. The current public demo uses synthetic data only and is not a production taxpayer-data environment."],
  ["Does Wedge lend to businesses?", "Not in V1. The product creates higher-quality operational evidence first. Any future credit workflow would be permissioned and delivered with licensed financial institutions."],
  ["What happens if the authority endpoint is unavailable?", "The system models explicit retry, reconciliation, and offline-queue states so failures are visible and recoverable rather than hidden behind a generic success message."],
  ["Can we export our data?", "Yes. The product is designed around portable records, stable APIs, and exportable audit history. Switching cost should come from operational value, not hostage data."],
];

function LeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, setState] = useState<"idle"|"sending"|"done"|"preview"|"error">("idle");
  const [message, setMessage] = useState("");
  useEffect(() => { if (!open) { setState("idle"); setMessage(""); } }, [open]);
  useEffect(() => { if (!open) return; const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();}; window.addEventListener("keydown",onKey); return()=>window.removeEventListener("keydown",onKey); }, [open,onClose]);
  if (!open) return null;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setState("sending"); setMessage("");
    const data = new FormData(event.currentTarget);
    const body = Object.fromEntries(data.entries());
    try {
      const response = await fetch("/api/marketing/lead", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(body) });
      const result = await response.json() as { preview?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error || "Request could not be sent");
      if (result.preview) { setState("preview"); setMessage("Your details passed validation. Lead delivery is in preview mode until a production webhook is connected."); }
      else { setState("done"); setMessage("Request received. We’ll use these details to prepare the pilot discussion."); }
    } catch (e) { setState("error"); setMessage(e instanceof Error ? e.message : "Request could not be sent"); }
  };
  return <div className="mkt-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="mkt-modal" role="dialog" aria-modal="true" aria-labelledby="pilot-title">
    <button className="mkt-modal-close" onClick={onClose} aria-label="Close pilot request">×</button>
    <span className="mkt-kicker">PILOT ACCESS</span><h2 id="pilot-title">Map your first fiscal workflow.</h2><p>Four fields. We use them to scope the ERP path, invoice volume, and rollout shape.</p>
    <form onSubmit={submit} className="mkt-form" noValidate>
      <label><span>Name</span><input name="name" autoComplete="name" minLength={2} maxLength={100} required placeholder="Your name"/></label>
      <label><span>Work email</span><input name="email" type="email" autoComplete="email" maxLength={160} required placeholder="you@company.com"/></label>
      <label><span>Company</span><input name="company" autoComplete="organization" minLength={2} maxLength={160} required placeholder="Company or ERP vendor"/></label>
      <label><span>Monthly invoice volume</span><select name="volume" required defaultValue=""><option value="" disabled>Select range</option><option>Under 3,000</option><option>3,000–15,000</option><option>15,000–100,000</option><option>100,000+</option></select></label>
      {message ? <div className={`mkt-form-message ${state}`} role="status">{message}</div> : null}
      <button className="mkt-btn mkt-btn-primary mkt-btn-wide" disabled={state==="sending"}>{state==="sending"?"Sending…":"Request pilot access"}<Icon name="arrow"/></button>
      <small>Production delivery can be connected through <code>MARKETING_LEAD_WEBHOOK_URL</code>.</small>
    </form>
  </section></div>;
}

export function MarketingSite() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navDense, setNavDense] = useState(false);
  const [feature, setFeature] = useState(0);
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [leadOpen, setLeadOpen] = useState(false);
  useEffect(() => { const onScroll=()=>setNavDense(window.scrollY>20); onScroll(); window.addEventListener("scroll",onScroll,{passive:true}); return()=>window.removeEventListener("scroll",onScroll); },[]);
  useEffect(() => { document.documentElement.style.scrollBehavior="smooth"; return()=>{document.documentElement.style.scrollBehavior="";}; },[]);
  const prices = useMemo(()=> annual ? { pilot:"4,083", scale:"12,417", note:"Billed annually · two months included" } : { pilot:"4,900", scale:"14,900", note:"Billed monthly" },[annual]);

  return <div className="mkt-site">
    <Atmosphere/>
    <header className={`mkt-nav-wrap${navDense?" dense":""}`}>
      <nav className="mkt-nav" aria-label="Primary navigation">
        <Link href="#top" className="mkt-brand"><BrandMark/><span>Wedge Ethiopia</span></Link>
        <div className="mkt-nav-links">{[["Product","#product"],["Workflow","#workflow"],["Proof","#proof"],["Pricing","#pricing"],["FAQ","#faq"]].map(([l,h])=><Link key={h} href={h}>{l}</Link>)}</div>
        <div className="mkt-nav-actions"><Link href="/workspace" className="mkt-text-link">Workspace</Link><Magnetic className="mkt-btn mkt-btn-primary" onClick={()=>setLeadOpen(true)}>Request pilot <Icon name="arrow" size={16}/></Magnetic></div>
        <button className={`mkt-menu-toggle${menuOpen?" open":""}`} aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}><span/><span/><span/></button>
      </nav>
      <div className={`mkt-drawer${menuOpen?" open":""}`}>{[["Product","#product"],["Workflow","#workflow"],["Proof","#proof"],["Pricing","#pricing"],["FAQ","#faq"]].map(([l,h])=><Link key={h} href={h} onClick={()=>setMenuOpen(false)}>{l}</Link>)}<Link href="/workspace" onClick={()=>setMenuOpen(false)}>Open workspace</Link><button className="mkt-btn mkt-btn-primary" onClick={()=>{setMenuOpen(false);setLeadOpen(true);}}>Request pilot</button></div>
    </header>

    <main id="top">
      <section className="mkt-hero mkt-shell">
        <div className="mkt-hero-copy">
          <Reveal><div className="mkt-kicker-line"><span>FISCAL INFRASTRUCTURE / ETHIOPIA</span><i/></div></Reveal>
          <Reveal delay={70}><h1>Make every invoice <em>explainable.</em></h1></Reveal>
          <Reveal delay={130}><p className="mkt-hero-sub">Wedge gives ERP vendors and finance teams one controlled path from invoice creation to fiscal clearance, signed events, reconciliation, and an audit trail that still makes sense months later.</p></Reveal>
          <Reveal delay={190}><div className="mkt-hero-actions"><Magnetic className="mkt-btn mkt-btn-primary mkt-btn-lg" onClick={()=>setLeadOpen(true)}>Request pilot access <Icon name="arrow"/></Magnetic><Magnetic href="/workspace" className="mkt-btn mkt-btn-ghost mkt-btn-lg">Open product demo</Magnetic></div></Reveal>
          <Reveal delay={250}><div className="mkt-trust-line"><span><Icon name="shield" size={15}/> Synthetic public demo</span><span><Icon name="ledger" size={15}/> Double-entry core</span><span><Icon name="webhook" size={15}/> Signed event delivery</span></div></Reveal>
        </div>
        <Reveal className="mkt-hero-visual" delay={120}><ProductFrame/></Reveal>
      </section>

      <section className="mkt-proof-strip" aria-label="Integration surfaces"><div className="mkt-shell mkt-proof-inner"><span className="mkt-proof-label">BUILT TO SIT BETWEEN</span><div className="mkt-marquee"><div className="mkt-marquee-track">{["ODOO","ERPNEXT","CUSTOM ERP","POS","REST API","SIGNED WEBHOOKS","CSV MIGRATION","ACCOUNTING OPS","ODOO","ERPNEXT","CUSTOM ERP","POS","REST API","SIGNED WEBHOOKS"].map((x,i)=><span key={`${x}-${i}`}>{x}</span>)}</div></div></div></section>

      <section className="mkt-section mkt-shell" id="problem">
        <Reveal><div className="mkt-section-head split"><div><span className="mkt-kicker">THE COSTLY STATUS QUO</span><h2>Fiscal operations break at the handoffs.</h2></div><p>Businesses do not need another isolated invoice screen. They need the transitions between ERP, tax logic, authority response, payment evidence, correction, and audit to be controlled.</p></div></Reveal>
        <div className="mkt-pain-grid">
          {[
            ["01","ERP drift","Every source system encodes customers, branches, tax lines, and corrections differently. Integration debt compounds with each business."],
            ["02","Invisible failure","A request times out, a user retries, and now nobody knows whether the fiscal event failed, duplicated, or needs reconciliation."],
            ["03","Correction ambiguity","Edits overwrite history. Credit and debit notes are detached from the transaction they are meant to correct."],
            ["04","Audit scramble","Finance teams reconstruct what happened from screenshots, support chats, spreadsheets, and whatever the ERP still remembers."],
          ].map(([n,t,b],i)=><Reveal key={t} delay={i*70}><article className="mkt-pain-card"><div className="mkt-card-num">{n}</div><h3>{t}</h3><p>{b}</p><div className="mkt-card-line"/></article></Reveal>)}
        </div>
      </section>

      <section className="mkt-section mkt-solution" id="product">
        <div className="mkt-shell">
          <Reveal><div className="mkt-section-head"><span className="mkt-kicker">THE CONTROL LAYER</span><h2>One fiscal contract. Many business systems.</h2><p>Normalize the input once, preserve the evidence, and let country-specific fiscal adapters change without forcing every ERP integration to change with them.</p></div></Reveal>
          <Reveal delay={100}><div className="mkt-architecture">
            <div className="mkt-architecture-column source"><span className="mkt-arch-label">SOURCE SYSTEMS</span>{["Odoo / ERPNext","Retail POS","Custom ERP","Marketplace"].map(x=><div className="mkt-node" key={x}>{x}<span>→</span></div>)}</div>
            <div className="mkt-architecture-core"><div className="mkt-core-glow"/><BrandMark/><strong>Wedge canonical rail</strong><span>Validation · state · ledger · audit</span><div className="mkt-core-metrics"><b>Idempotent</b><b>Tenant-isolated</b><b>Versioned</b></div></div>
            <div className="mkt-architecture-column target"><span className="mkt-arch-label">DOWNSTREAM</span>{["Fiscal adapter","Signed webhook","Audit export","Lender data export*"].map(x=><div className="mkt-node" key={x}><span>→</span>{x}</div>)}<small>*future, permissioned</small></div>
          </div></Reveal>
        </div>
      </section>

      <section className="mkt-section mkt-shell" id="features">
        <Reveal><div className="mkt-section-head split"><div><span className="mkt-kicker">PRODUCT TOUR</span><h2>Designed around failure, not just the happy path.</h2></div><p>Choose a layer. Each one exists because regulated financial workflows eventually meet retries, corrections, access boundaries, or evidence requests.</p></div></Reveal>
        <div className="mkt-tour">
          <div className="mkt-tour-tabs" role="tablist" aria-label="Product capabilities">{featureData.map((f,i)=><button key={f.key} role="tab" aria-selected={feature===i} onClick={()=>setFeature(i)} className={feature===i?"active":""}><span><Icon name={f.icon}/></span><div><strong>{f.label}</strong><small>{f.meta}</small></div><i/></button>)}</div>
          <div className="mkt-tour-panel" role="tabpanel" key={feature}><div className="mkt-tour-copy"><span className="mkt-kicker">0{feature+1} / 04</span><h3>{featureData[feature].title}</h3><p>{featureData[feature].body}</p><div className="mkt-tour-stat"><strong>{featureData[feature].stat}</strong><span>{featureData[feature].meta}</span></div></div><div className="mkt-tour-visual"><div className="mkt-codebar"><span>POST /v1/invoices</span><b>201</b></div><pre>{feature===0?`{\n  "source_ref": "ERP-10452",\n  "status": "accepted",\n  "authority_ref": "…",\n  "audit_seq": 18442\n}`:feature===1?`Idempotency-Key: erp-10452\nX-Request-Id: req_8FD2\n\n→ stable validation\n→ signed callbacks\n→ retry-safe`:feature===2?`Dr  Accounts receivable   1,245,000\nCr  Revenue               1,082,609\nCr  VAT output              162,391\n\n✓ balanced\n✓ append-only`: `issuer      Fayda / identity provider\nsubject     pseudonymous reference\nauthority   company signatory record\n\nidentity ≠ company authority`}</pre></div></div>
        </div>
      </section>

      <section className="mkt-section mkt-workflow" id="workflow"><div className="mkt-shell">
        <Reveal><div className="mkt-section-head"><span className="mkt-kicker">HOW IT WORKS</span><h2>Four controlled transitions. No mystery middleware.</h2></div></Reveal>
        <div className="mkt-steps">{[
          ["01","Connect","Map the ERP payload once to Wedge’s canonical invoice contract.","branch" as IconName],
          ["02","Validate","Apply deterministic schema, tax, identity, branch, and amount checks before clearance.","shield" as IconName],
          ["03","Clear + observe","Submit through the configured authority adapter and expose every retry or reconciliation state.","route" as IconName],
          ["04","Reconcile","Write the fiscal result to audit history, ledger, ERP callbacks, and exportable evidence.","ledger" as IconName],
        ].map(([n,t,b,ic],i)=><Reveal key={String(t)} delay={i*80}><article className="mkt-step"><div className="mkt-step-top"><span>{n}</span><i/><div className="mkt-icon-box"><Icon name={ic as IconName}/></div></div><h3>{t}</h3><p>{b}</p></article></Reveal>)}</div>
      </div></section>

      <section className="mkt-section mkt-shell" id="proof">
        <Reveal><div className="mkt-section-head split"><div><span className="mkt-kicker">PILOT PROOF</span><h2>What a serious rollout has to prove.</h2></div><p>We do not publish fabricated customer logos or invented testimonials. Until real references exist, these are explicit launch targets and buyer requirements.</p></div></Reveal>
        <div className="mkt-proof-cards">
          {[
            ["Integration","< 1 day","Target time to map a standard ERP invoice feed after credentials and field definitions are available.","“Do not make each branch become a software project.”"],
            ["Operations","> 99.5%","Target terminal visibility for submitted fiscal events: accepted, rejected, or explicitly queued for reconciliation.","“If it fails, show me exactly where and what happens next.”"],
            ["Evidence","100%","Target append-only coverage for invoice state changes, corrections, ledger postings, and outbound event attempts.","“Months later, I need the same story the system told on day one.”"],
          ].map(([label,metric,body,quote],i)=><Reveal key={label} delay={i*80}><article className="mkt-proof-card"><span className="mkt-kicker">{label}</span><div className="mkt-big-metric">{metric}</div><p>{body}</p><blockquote>{quote}</blockquote><small>Launch target / buyer requirement</small></article></Reveal>)}
        </div>
        <Reveal><div className="mkt-counter-band"><div><strong><Counter value={8}/></strong><span>explicit fiscal states</span></div><div><strong><Counter value={4}/></strong><span>core audit actors</span></div><div><strong><Counter value={300} suffix="s"/></strong><span>webhook replay window</span></div><div><strong><Counter value={0} prefix="0"/></strong><span>fake endorsements</span></div></div></Reveal>
      </section>

      <section className="mkt-section mkt-pricing" id="pricing"><div className="mkt-shell">
        <Reveal><div className="mkt-section-head pricing-head"><div><span className="mkt-kicker">LAUNCH PRICING</span><h2>Price the workflow, not the confusion.</h2><p>Clear launch pricing while the accreditation and downstream fiscal-provider model is finalized. Pass-through provider fees, if any, are separate.</p></div><div className="mkt-billing-toggle" role="group" aria-label="Billing period"><button className={!annual?"active":""} onClick={()=>setAnnual(false)}>Monthly</button><button className={annual?"active":""} onClick={()=>setAnnual(true)}>Annual <span>2 months included</span></button></div></div></Reveal>
        <div className="mkt-price-grid">
          <Reveal><article className="mkt-price-card"><span className="mkt-kicker">PILOT</span><h3>Core</h3><p>For one business or ERP team proving the integration path.</p><div className="mkt-price"><b>Br {prices.pilot}</b><span>/ month</span></div><small>{prices.note}</small><ul>{["1 legal entity","3,000 accepted invoices / mo","Canonical invoice API","Signed webhooks","Audit history","Email onboarding"].map(x=><li key={x}><Icon name="check" size={15}/>{x}</li>)}</ul><button className="mkt-btn mkt-btn-ghost mkt-btn-wide" onClick={()=>setLeadOpen(true)}>Request pilot</button></article></Reveal>
          <Reveal delay={70}><article className="mkt-price-card featured"><div className="mkt-popular">MOST PRACTICAL START</div><span className="mkt-kicker">SCALE</span><h3>Operations</h3><p>For multi-entity finance teams and ERP partners moving beyond a single pilot.</p><div className="mkt-price"><b>Br {prices.scale}</b><span>/ month</span></div><small>{prices.note}</small><ul>{["Up to 5 legal entities","15,000 accepted invoices / mo","ERP connector support","Reconciliation views","Ledger exports","Priority implementation"].map(x=><li key={x}><Icon name="check" size={15}/>{x}</li>)}</ul><button className="mkt-btn mkt-btn-primary mkt-btn-wide" onClick={()=>setLeadOpen(true)}>Scope rollout</button></article></Reveal>
          <Reveal delay={140}><article className="mkt-price-card"><span className="mkt-kicker">INFRASTRUCTURE</span><h3>Platform</h3><p>For banks, marketplaces, large groups, and software platforms with custom throughput or control needs.</p><div className="mkt-price"><b>Custom</b></div><small>Contracted scope and SLA</small><ul>{["Custom entity and volume limits","Dedicated adapter work","Private networking options","SLA + incident process","Security review package","Migration planning"].map(x=><li key={x}><Icon name="check" size={15}/>{x}</li>)}</ul><button className="mkt-btn mkt-btn-ghost mkt-btn-wide" onClick={()=>setLeadOpen(true)}>Talk infrastructure</button></article></Reveal>
        </div>
        <Reveal><div className="mkt-pricing-note"><Icon name="shield"/><span>Additional cleared invoices above plan allowance: <strong>Br 1.50 / invoice</strong>. No lending revenue, payment custody, or hidden take-rate is included in these launch plans.</span></div></Reveal>
      </div></section>

      <section className="mkt-section mkt-shell" id="use-cases">
        <Reveal><div className="mkt-section-head split"><div><span className="mkt-kicker">WHERE IT FITS</span><h2>A rail for operators, not another destination app.</h2></div><p>Wedge is most valuable when invoices originate somewhere else and several teams still need one trustworthy operational record.</p></div></Reveal>
        <div className="mkt-use-grid">{[
          ["ERP vendors","Ship one fiscal integration layer across customers instead of bespoke logic per deployment.","webhook" as IconName],
          ["Multi-branch businesses","Keep entity, branch, tax, invoice, and correction states visible across operating locations.","branch" as IconName],
          ["Finance operations","Give accountants a reconciled record of what was issued, accepted, corrected, and delivered.","ledger" as IconName],
          ["Future lender partners","Export permissioned, higher-quality operating evidence without turning the fiscal rail into a lender.","identity" as IconName],
        ].map(([t,b,ic],i)=><Reveal key={String(t)} delay={i*60}><article className="mkt-use-card"><div className="mkt-icon-box"><Icon name={ic as IconName}/></div><h3>{t}</h3><p>{b}</p><span>Explore workflow <Icon name="arrow" size={14}/></span></article></Reveal>)}</div>
      </section>

      <section className="mkt-section mkt-faq" id="faq"><div className="mkt-shell mkt-faq-layout"><Reveal><div className="mkt-section-head"><span className="mkt-kicker">FAQ</span><h2>The questions a skeptical buyer should ask.</h2><p>Clear answers now are cheaper than surprises during implementation.</p></div></Reveal><div className="mkt-accordion">{faq.map(([q,a],i)=><Reveal key={q} delay={i*35}><div className={`mkt-faq-item${openFaq===i?" open":""}`}><button aria-expanded={openFaq===i} onClick={()=>setOpenFaq(openFaq===i?null:i)}><span>{q}</span><i>+</i></button><div className="mkt-faq-answer"><p>{a}</p></div></div></Reveal>)}</div></div></section>

      <section className="mkt-final"><div className="mkt-final-glow"/><div className="mkt-shell"><Reveal><div className="mkt-final-card"><span className="mkt-kicker">START WITH ONE REAL FLOW</span><h2>Connect one ERP. Prove one invoice path. Then scale the rail.</h2><p>Bring the source system, branch structure, and monthly volume. Wedge’s pilot is designed to surface the hard parts before they become production surprises.</p><div className="mkt-final-actions"><Magnetic className="mkt-btn mkt-btn-primary mkt-btn-lg" onClick={()=>setLeadOpen(true)}>Request pilot access <Icon name="arrow"/></Magnetic><Magnetic href="/workspace" className="mkt-btn mkt-btn-ghost mkt-btn-lg">Inspect live demo</Magnetic></div><div className="mkt-final-proof"><span><Icon name="shield" size={15}/> No fake certification claims</span><span><Icon name="ledger" size={15}/> Exportable audit history</span><span><Icon name="route" size={15}/> Adapter-based architecture</span></div></div></Reveal></div></section>
    </main>

    <footer className="mkt-footer"><div className="mkt-shell"><div className="mkt-footer-main"><div><Link href="#top" className="mkt-brand"><BrandMark/><span>Wedge Ethiopia</span></Link><p>Fiscal invoice infrastructure for Ethiopian business systems.</p></div><div className="mkt-footer-cols"><div><b>Product</b><Link href="#product">Product tour</Link><Link href="#workflow">Workflow</Link><Link href="#pricing">Pricing</Link><Link href="/workspace">Workspace</Link></div><div><b>Company</b><Link href="#proof">Pilot proof</Link><button onClick={()=>setLeadOpen(true)}>Request pilot</button><Link href="#faq">FAQ</Link></div><div><b>Legal</b><span>Privacy — drafting</span><span>Terms — drafting</span><span>Status — core demo online</span></div></div></div><div className="mkt-footer-bottom"><span>© 2026 Wedge Ethiopia</span><span>Addis Ababa · Infrastructure-first · Demo data only</span></div></div></footer>
    <LeadModal open={leadOpen} onClose={()=>setLeadOpen(false)}/>
  </div>;
}
