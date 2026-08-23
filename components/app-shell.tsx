import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

const nav = [["Dashboard","/"],["Invoices","/invoices"],["New invoice","/invoices/new"],["Audit log","/audit"],["Developers","/developers"]] as const;
export function AppShell({children}:{children:React.ReactNode}){
 return <div className="app-grid"><aside className="sidebar">
  <Link className="brand" href="/"><span className="brand-mark">WE</span><span>Wedge Ethiopia</span></Link>
  <div className="nav-section">Operations</div><nav className="nav">{nav.map(([l,h])=><Link key={h} href={h}>{l}</Link>)}</nav>
  <div className="nav-section">Authority</div><div className="card" style={{padding:12}}><div className="badge badge-yellow">Adapter controlled</div><div style={{fontSize:12,color:"var(--muted)",marginTop:10,lineHeight:1.5}}>The real MoR mapping remains disabled until the primary API contract is supplied.</div></div>
 </aside><main className="main"><header className="topbar">
  <Link className="brand mobile-brand" href="/"><span className="brand-mark">WE</span><span>Wedge Ethiopia</span></Link>
  <div className="badge badge-green">Core online</div><div style={{display:"flex",alignItems:"center",gap:10}}><span className="code" style={{color:"var(--muted)"}}>ETB · v0.1</span><LogoutButton/></div>
 </header><div className="content">{children}</div></main></div>;
}
