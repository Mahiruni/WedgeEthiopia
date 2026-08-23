export const dynamic = "force-dynamic";
import Link from "next/link";
import { formatMinor } from "@/src/domain/money";
import { StatusBadge } from "@/components/badge";
import { getInvoiceUiData } from "@/src/lib/ui-data";

export default async function DashboardPage() {
  const { mode, invoices, metrics } = await getInvoiceUiData();
  return <>
    <div className="row" style={{marginBottom:22,alignItems:"flex-end"}}><div><h1 className="page-title">Operations</h1><div className="page-sub">Fiscal clearance, tenant activity, and reconciliation health.</div></div><Link className="btn btn-primary" href="/invoices/new">Create invoice</Link></div>
    {mode === "demo" ? <div className="callout" style={{marginBottom:16}}><strong>Demo mode:</strong> synthetic data is shown until Supabase browser credentials and a tenant membership are configured.</div> : null}
    <section className="grid-4">
      <div className="card"><div className="metric-label">Tenant scope</div><div className="metric-value">{metrics.businesses}</div><div className="metric-sub">business entity context</div></div>
      <div className="card"><div className="metric-label">Accepted · 24h</div><div className="metric-value">{metrics.acceptedToday.toLocaleString()}</div><div className="metric-sub">authority acknowledgements</div></div>
      <div className="card"><div className="metric-label">Terminal success</div><div className="metric-value">{metrics.successRate}</div><div className="metric-sub">accepted ÷ accepted + rejected</div></div>
      <div className="card"><div className="metric-label">Fiscalized value · 24h</div><div className="metric-value">{formatMinor(metrics.fiscalizedValueMinor)}</div><div className="metric-sub">ETB accepted/delivered</div></div>
    </section>
    <section style={{marginTop:18}}><div className="row" style={{marginBottom:10}}><h2 className="section-title">Recent invoices</h2><Link className="btn" href="/invoices">View all</Link></div><div className="table-wrap"><table><thead><tr><th>Invoice</th><th>ERP ref</th><th>Counterparty</th><th>Issued</th><th>Total</th><th>Status</th></tr></thead><tbody>{invoices.slice(0,8).map(x=><tr key={x.id}><td className="code">{x.id}</td><td>{x.sourceRef}</td><td>{x.counterparty}</td><td>{x.issuedAt}</td><td>{formatMinor(x.totalMinor)}</td><td><StatusBadge state={x.status}/></td></tr>)}</tbody></table></div></section>
  </>;
}
