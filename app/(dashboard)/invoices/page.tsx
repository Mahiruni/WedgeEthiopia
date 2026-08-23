export const dynamic = "force-dynamic";
import Link from "next/link";
import { formatMinor } from "@/src/domain/money";
import { StatusBadge } from "@/components/badge";
import { getInvoiceUiData } from "@/src/lib/ui-data";

export default async function InvoicesPage(){
 const {invoices,mode}=await getInvoiceUiData();
 return <><div className="row" style={{marginBottom:22,alignItems:"flex-end"}}><div><h1 className="page-title">Invoices</h1><div className="page-sub">Canonical fiscal objects from connected ERPs. {mode==="demo"?"Synthetic preview data is active.":"Live tenant RLS is active."}</div></div><Link className="btn btn-primary" href="/invoices/new">New invoice</Link></div><div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Source reference</th><th>Counterparty</th><th>Issued</th><th>Total</th><th>Fiscal state</th></tr></thead><tbody>{invoices.map(x=><tr key={x.id}><td className="code">{x.id}</td><td>{x.sourceRef}</td><td>{x.counterparty}</td><td>{x.issuedAt}</td><td>{formatMinor(x.totalMinor)}</td><td><StatusBadge state={x.status}/></td></tr>)}</tbody></table></div></>;
}
