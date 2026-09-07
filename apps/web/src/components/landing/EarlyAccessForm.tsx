"use client";

import { useState } from "react";
import { tokens } from "@pairband/ui";

const ROLES = [
  { value: "eurc_holder", label: "EURC holder" },
  { value: "option_writer", label: "Option writer" },
  { value: "market_maker", label: "Market maker" },
  { value: "integrator", label: "Integrator" },
  { value: "researcher", label: "Researcher" },
] as const;

const PRIVACY_VERSION = "2026-09-07";

export function EarlyAccessForm() {
  const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:3001";
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("eurc_holder");
  const [intendedUse, setIntendedUse] = useState("");
  const [exposureBand, setExposureBand] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [updates, setUpdates] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "received" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!privacy) {
      setError("Privacy acknowledgment is required.");
      return;
    }
    if (intendedUse.length > 500) {
      setError("Intended use must be at most 500 characters.");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch(`${apiOrigin}/v1/early-access`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          intendedUse: intendedUse || undefined,
          exposureBand: exposureBand || undefined,
          privacyAcknowledged: true,
          privacyVersion: PRIVACY_VERSION,
          productUpdatesOptIn: updates,
          clientRequestId: crypto.randomUUID(),
          website: honeypot,
        }),
      });
      if (res.status === 202) {
        setStatus("received");
        return;
      }
      const body = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setStatus("error");
      setError(body?.error?.message ?? "Could not submit. Your fields were kept — try again.");
    } catch {
      setStatus("error");
      setError("Network error. Your fields were kept — try again.");
    }
  }

  return (
    <section id="early-access" aria-labelledby="early-access-heading" style={{ display: "grid", gap: 16 }}>
      <h2 id="early-access-heading" style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.75rem" }}>
        Early access
      </h2>
      <p style={{ margin: 0, color: tokens.muted, maxWidth: 560 }}>
        Preview mode collects interest only. No wallet required. We do not claim a confirmation email
        was sent unless a provider is configured and verified.
      </p>

      {status === "received" ? (
        <p role="status" style={{ margin: 0, fontWeight: 700, color: tokens.action }}>
          Your request has been received.
        </p>
      ) : (
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 14, maxWidth: 480 }}>
          <label style={labelStyle}>
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} style={fieldStyle}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Intended use (optional, max 500)
            <textarea
              value={intendedUse}
              onChange={(e) => setIntendedUse(e.target.value)}
              maxLength={500}
              rows={3}
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            Expected EURC exposure band (optional)
            <input value={exposureBand} onChange={(e) => setExposureBand(e.target.value)} style={fieldStyle} />
          </label>
          {/* honeypot */}
          <label style={{ position: "absolute", left: -9999 }} aria-hidden="true">
            Website
            <input tabIndex={-1} value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14 }}>
            <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} required />
            <span>
              I acknowledge the privacy notice (version {PRIVACY_VERSION}). Early-access data is stored
              privately and is not a live trading account.
            </span>
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14 }}>
            <input type="checkbox" checked={updates} onChange={(e) => setUpdates(e.target.checked)} />
            <span>Optional: send product updates if email delivery is later configured.</span>
          </label>
          {error ? (
            <p role="alert" style={{ margin: 0, color: tokens.critical }}>
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={status === "submitting"}
            style={{
              border: "none",
              borderRadius: 12,
              background: tokens.action,
              color: "#fff",
              fontWeight: 700,
              padding: "12px 16px",
              cursor: "pointer",
              width: "fit-content",
            }}
          >
            {status === "submitting" ? "Submitting…" : "Join early access"}
          </button>
        </form>
      )}
    </section>
  );
}

const labelStyle: React.CSSProperties = { display: "grid", gap: 6, fontWeight: 600, fontSize: 14 };
const fieldStyle: React.CSSProperties = {
  borderRadius: tokens.radiusField,
  border: `1px solid ${tokens.border}`,
  padding: "10px 12px",
  fontSize: 16,
  fontWeight: 400,
};
