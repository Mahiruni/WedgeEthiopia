# MoR production adapter completion checklist

Do not replace `src/lib/fiscal/mor.ts` from secondary summaries. Complete these items from primary regulator material:

- Base URLs and sandbox/production environments
- Client authentication method, certificate requirements and rotation
- Canonical taxpayer/branch identifiers
- Invoice number, IRN/RRN semantics and QR payload format
- Invoice line tax-code dictionary and validation rules
- Timestamp/timezone requirements
- Signature/canonicalization requirements
- Clearance response semantics
- Duplicate/idempotency behavior
- Timeout and retry rules
- Offline-queue rules and maximum transmission delay
- Credit-note/debit-note schemas and original-invoice linkage
- Cancellation rules, if any
- Event/webhook/polling mechanism
- Retention and audit export requirements
- Conformance test cases and certification evidence

Every mapping should be versioned as `country=ET`, `authority=MOR`, `spec_version=<official value>` so historical invoices can be reproduced against the rule set active when issued.
