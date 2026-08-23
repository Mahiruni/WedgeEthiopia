import { getLegalEntitiesUiData } from "@/src/lib/ui-data";
import { InvoiceForm } from "./invoice-form";
export const dynamic="force-dynamic";
export default async function NewInvoicePage(){const {entities,mode}=await getLegalEntitiesUiData();return <><div style={{marginBottom:22}}><h1 className="page-title">New invoice</h1><div className="page-sub">Manual path for tenant operators; ERP integrations should use the machine API.</div></div><InvoiceForm entities={entities} demo={mode==="demo"}/></>}
