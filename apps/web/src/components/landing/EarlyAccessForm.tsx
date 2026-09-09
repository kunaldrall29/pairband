"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:3001";

export function EarlyAccessForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus("loading");
    try {
      const res = await fetch(`${API}/v1/early-access`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          role: form.get("role"),
          intendedUse: form.get("intendedUse") || undefined,
          privacyVersion: "2026-09-09",
          website: form.get("website") || "",
        }),
      });
      if (res.status === 202) {
        setStatus("ok");
        setMessage("Your request has been received.");
        e.currentTarget.reset();
      } else {
        setStatus("err");
        setMessage("Could not submit. Try again.");
      }
    } catch {
      setStatus("err");
      setMessage("Network unavailable.");
    }
  }

  return (
    <section id="early-access" className="section" style={{ paddingBottom: "5.5rem" }}>
      <div className="container" style={{ maxWidth: 640 }}>
        <h2>Tell us how you would use it.</h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: "1.5rem", lineHeight: 1.55 }}>
          Early access is a conversation, not a commitment. No wallet, deposit, or documents needed.
        </p>
        <form className="card" style={{ padding: "1.5rem" }} onSubmit={onSubmit}>
          <label style={{ display: "grid", gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 0.85, fontWeight: 600 }}>Email</span>
            <input
              required
              name="email"
              type="email"
              placeholder="you@company.com"
              style={fieldStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 0.85, fontWeight: 600 }}>Role</span>
            <select name="role" required defaultValue="payer" style={fieldStyle}>
              <option value="payer">Payer</option>
              <option value="ops">Ops / finance</option>
              <option value="market_maker">Market maker (seed USDC/EURC)</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 0.85, fontWeight: 600 }}>Intended use (optional)</span>
            <textarea name="intendedUse" rows={3} style={{ ...fieldStyle, resize: "vertical" }} />
          </label>
          <input name="website" tabIndex={-1} autoComplete="off" style={{ display: "none" }} />
          <button className="btn btn-primary" type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Sending…" : "Join early access"}
          </button>
          {message ? (
            <p className="muted" style={{ marginBottom: 0, marginTop: 12 }} role="status">
              {message}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}

const fieldStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "0.75rem 0.9rem",
  background: "#fffdf8",
  color: "var(--ink)",
};
