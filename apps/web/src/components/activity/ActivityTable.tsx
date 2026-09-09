"use client";

import { useEffect, useState } from "react";
import { API_ORIGIN, fetchActivity, formatUnits, type ActivityItem } from "@/lib/api";

export function ActivityTable() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity()
      .then(setItems)
      .catch(() => setError("Sign in required (Workspace) or network unavailable"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.85rem" }}>Activity</h1>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            Wire-style rows. Pending is never settled.
          </p>
        </div>
        <a className="btn btn-secondary" href={`${API_ORIGIN}/v1/activity.csv`}>
          Export CSV
        </a>
      </div>
      <div className="card" style={{ marginTop: "1.25rem", overflowX: "auto" }}>
        {loading ? <p style={{ padding: "1.25rem" }} className="muted">Loading…</p> : null}
        {error ? <p style={{ padding: "1.25rem", color: "var(--danger)" }}>{error}</p> : null}
        {!loading && !error && items.length === 0 ? (
          <p style={{ padding: "1.25rem" }} className="muted">
            No receipts yet. Sign in on Workspace, then Pay USDC. Unauthenticated activity listing is disabled.
          </p>
        ) : null}
        {items.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Payee</th>
                <th>They received</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Explorer</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>
                    {row.payee.slice(0, 6)}…{row.payee.slice(-4)}
                  </td>
                  <td>
                    {formatUnits(row.amountOut, 6)} {row.tokenOut}
                  </td>
                  <td>{row.reference}</td>
                  <td>{row.status}</td>
                  <td>
                    <a href={row.explorerUrl} target="_blank" rel="noreferrer">
                      View
                    </a>
                    {" · "}
                    <a href={`/app/receipt/${row.id}`}>Receipt</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}
