import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wedge Ethiopia",
  description: "Multi-tenant fiscal invoice compliance infrastructure for Ethiopian businesses",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
