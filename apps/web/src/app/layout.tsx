import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pairband — preview",
  description:
    "Pairband options-v2 preview scaffold. Not live finance; USDC-backed EURC options on Arc (in development).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
