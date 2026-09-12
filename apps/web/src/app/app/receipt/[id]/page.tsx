"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchActivity, formatUnits, type ActivityItem } from "@/lib/api";

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const [row, setRow] = useState<ActivityItem | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchActivity()
      .then((items) => {
        const found = items.find((i) => i.id === params.id) ?? null;
        setRow(found);
        if (!found) setError("Receipt not found");
      })
      .catch(() => setError("Network unavailable"));
  }, [params.id]);

  if (error) {
    return (
      <div className="card" style={{ padding: "1.5rem" }}>
        <h1 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>{error}</h1>
        <a className="btn btn-primary" href="/app/activity">
          Activity
        </a>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="card" style={{ padding: "1.5rem" }}>
        <p className="muted">Loading receipt…</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <h1 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>Receipt</h1>
      <dl style={{ display: "grid", gap: 12 }}>
        <Item label="Amount received" value={`${formatUnits(row.amountOut, 6)} ${row.tokenOut}`} />
        <Item label="You spent" value={`${formatUnits(row.amountIn, 6)} ${row.tokenIn}`} />
        <Item label="Pair" value={`${row.tokenIn} → ${row.tokenOut}`} />
        <Item label="Fee" value={row.tokenIn === row.tokenOut ? "0" : "see quote"} />
        <Item label="Memo id" value={row.memoId ?? "—"} />
        <Item label="Status" value={row.status} />
        <Item label="Explorer" value={row.explorerUrl} />
      </dl>
      <a className="btn btn-secondary" href="/app/activity" style={{ marginTop: 8 }}>
        Back to Activity
      </a>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "9rem 1fr", gap: 8 }}>
      <dt className="muted">{label}</dt>
      <dd style={{ margin: 0, fontWeight: 600, wordBreak: "break-all" }}>{value}</dd>
    </div>
  );
}
