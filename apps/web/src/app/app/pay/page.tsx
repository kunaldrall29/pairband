"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PayForm } from "@/components/pay/PayForm";

function PayInner() {
  const params = useSearchParams();
  const payee = params.get("payee") ?? undefined;
  const orgId = params.get("orgId") ?? undefined;
  return <PayForm initialPayee={payee} orgId={orgId} />;
}

export default function PayPage() {
  return (
    <Suspense fallback={<div className="card" style={{ padding: "1.5rem" }}>Loading…</div>}>
      <PayInner />
    </Suspense>
  );
}
