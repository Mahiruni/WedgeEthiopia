import type { Metadata } from "next";
import "./globals.css";
import "./marketing.css";

export const metadata: Metadata = {
  title: { default: "Wedge Ethiopia — Fiscal infrastructure for business systems", template: "%s · Wedge Ethiopia" },
  description: "A controlled fiscal invoicing layer for Ethiopian ERP vendors and finance teams: validation, clearance orchestration, signed events, reconciliation, ledger, and audit evidence.",
  openGraph: {
    title: "Wedge Ethiopia — Make every invoice explainable",
    description: "Fiscal invoice infrastructure for Ethiopian business systems.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
