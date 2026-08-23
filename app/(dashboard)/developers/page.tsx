export default function DevelopersPage(){return <>
  <div style={{marginBottom:22}}><h1 className="page-title">Developer integration</h1><div className="page-sub">Stable ERP-facing API; regulator adapters remain private implementation details.</div></div>
  <div className="grid-2">
    <div className="card"><h2 className="section-title">Create invoice</h2><div style={{marginTop:12}}><pre>{`curl -X POST https://api.example.et/api/v1/invoices \\
  -H 'X-API-Key: fr_live_...' \\
  -H 'Idempotency-Key: ERP-10453' \\
  -H 'Content-Type: application/json' \\
  -d '{\n    "legal_entity_id": "...",\n    "source_ref": "ERP-10453",\n    "currency": "ETB",\n    "lines": [{\n      "description": "Service",\n      "quantity_milli": 1000,\n      "unit_price_minor": 100000,\n      "tax_rate_bps": 1500\n    }]\n  }'`}</pre></div></div>
    <div className="card"><h2 className="section-title">Submit for fiscal clearance</h2><div style={{marginTop:12}}><pre>{`POST /api/v1/invoices/{id}/submit\nX-API-Key: fr_live_...\nX-Request-Id: optional-trace-id`}</pre></div><div className="callout" style={{marginTop:12}}>The included mock fiscal adapter can accept/reject submissions without pretending to implement MoR's unverified production protocol.</div></div>
  </div>
  <div className="card" style={{marginTop:14}}><h2 className="section-title">Webhook verification</h2><div style={{marginTop:12}}><pre>{`signed_input = timestamp + "\\n" + event_id + "\\n" + sha256(raw_body)\nalgorithm = Ed25519\nreplay_window = 300 seconds`}</pre></div></div>
</>}
