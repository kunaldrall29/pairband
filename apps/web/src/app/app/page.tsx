import { ModeBadge } from "../../components/ModeBadge";

export default function AppShellPreview() {
  return (
    <main style={{ padding: "2rem", maxWidth: "48rem" }}>
      <ModeBadge mode="preview" />
      <h1 style={{ fontFamily: "var(--font-display)" }}>App shell (preview)</h1>
      <p style={{ color: "var(--muted)" }}>
        Protect, Earn, Markets, and Portfolio routes arrive in later stages. This page is a labeled
        preview placeholder — not a live trading interface.
      </p>
    </main>
  );
}
