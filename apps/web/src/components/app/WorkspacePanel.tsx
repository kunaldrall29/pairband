"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { API_BASE, fetchMe, sessionJson, type MeResponse } from "@/lib/session-api";

type Member = { address: string; role: string; spendLimitUsd: string | null; active: boolean };
type Payee = { id: string; address: string; label: string; defaultToken: string };

export function WorkspacePanel() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [signedIn, setSignedIn] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [orgName, setOrgName] = useState("Acme Ops");
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [payeeList, setPayeeList] = useState<Payee[]>([]);
  const [inviteAddress, setInviteAddress] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "payer" | "viewer">("payer");
  const [inviteLimit, setInviteLimit] = useState("10000");
  const [payeeAddress, setPayeeAddress] = useState("");
  const [payeeLabel, setPayeeLabel] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const refreshMe = useCallback(async () => {
    const data = await fetchMe();
    setMe(data);
    setSignedIn(true);
    if (!selectedOrg && data.orgs[0]) setSelectedOrg(data.orgs[0].id);
    return data;
  }, [selectedOrg]);

  useEffect(() => {
    fetchMe()
      .then((data) => {
        setMe(data);
        setSignedIn(true);
        if (data.orgs[0]) setSelectedOrg(data.orgs[0].id);
      })
      .catch(() => {
        setSignedIn(false);
        setMe(null);
      });
  }, []);

  useEffect(() => {
    if (!signedIn || !selectedOrg) return;
    Promise.all([
      sessionJson<{ items: Member[] }>(`/v1/orgs/${selectedOrg}/members`),
      sessionJson<{ items: Payee[] }>(`/v1/orgs/${selectedOrg}/payees`),
    ])
      .then(([m, p]) => {
        setMembers(m.items);
        setPayeeList(p.items);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "load_failed"));
  }, [signedIn, selectedOrg]);

  async function signIn() {
    setError("");
    if (!address) return;
    try {
      const { message } = await sessionJson<{ message: string }>("/v1/auth/nonce", {
        method: "POST",
        body: JSON.stringify({ address }),
      });
      const signature = await signMessageAsync({ message });
      await sessionJson("/v1/auth/verify", {
        method: "POST",
        body: JSON.stringify({ address, message, signature }),
      });
      await refreshMe();
      setStatus("Signed in.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "sign_in_failed");
    }
  }

  async function createOrg() {
    if (!signedIn) return;
    setError("");
    try {
      const org = await sessionJson<{ id: string }>("/v1/orgs", {
        method: "POST",
        body: JSON.stringify({ name: orgName }),
      });
      setSelectedOrg(org.id);
      await refreshMe();
      setStatus(`Workspace “${orgName}” created.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "create_failed");
    }
  }

  async function inviteMember() {
    if (!signedIn || !selectedOrg) return;
    setError("");
    try {
      await sessionJson(`/v1/orgs/${selectedOrg}/members`, {
        method: "POST",
        body: JSON.stringify({
          address: inviteAddress,
          role: inviteRole,
          spendLimitUsd: inviteRole === "viewer" ? null : String(Math.round(Number(inviteLimit) * 1e6)),
        }),
      });
      const m = await sessionJson<{ items: Member[] }>(`/v1/orgs/${selectedOrg}/members`);
      setMembers(m.items);
      setStatus("Member invited — they can sign in with that wallet.");
      setInviteAddress("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "invite_failed");
    }
  }

  async function addPayee() {
    if (!signedIn || !selectedOrg) return;
    setError("");
    try {
      await sessionJson(`/v1/orgs/${selectedOrg}/payees`, {
        method: "POST",
        body: JSON.stringify({ address: payeeAddress, label: payeeLabel, defaultToken: "USDC" }),
      });
      const p = await sessionJson<{ items: Payee[] }>(`/v1/orgs/${selectedOrg}/payees`);
      setPayeeList(p.items);
      setPayeeAddress("");
      setPayeeLabel("");
      setStatus("Payee saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "payee_failed");
    }
  }

  if (!isConnected) {
    return (
      <div className="card" style={{ padding: "1.5rem" }}>
        <h1 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>Workspace</h1>
        <p className="muted">Connect a wallet, then sign in (SIWE) to create an org, invite a second human, and set limits.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div className="card" style={{ padding: "1.5rem" }}>
        <h1 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>Workspace</h1>
        <p className="muted">Roles, spend limits, saved payees, CSV. Not a bank.</p>
        {!signedIn ? (
          <button className="btn btn-primary" type="button" onClick={signIn}>
            Sign in with wallet
          </button>
        ) : (
          <p style={{ marginBottom: 0 }}>
            Signed in as <strong>{me?.address}</strong>
          </p>
        )}
        {status ? <p className="muted">{status}</p> : null}
        {error ? (
          <p style={{ color: "var(--danger)" }} role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {signedIn ? (
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)", fontSize: "1.35rem" }}>Create workspace</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input value={orgName} onChange={(e) => setOrgName(e.target.value)} style={inputStyle} />
            <button className="btn btn-primary" type="button" onClick={createOrg}>
              Create
            </button>
          </div>
          {me?.orgs?.length ? (
            <label style={{ display: "grid", gap: 6, marginTop: 16 }}>
              <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>Active workspace</span>
              <select value={selectedOrg ?? ""} onChange={(e) => setSelectedOrg(e.target.value)} style={inputStyle}>
                {me.orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.role})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {signedIn && selectedOrg ? (
        <>
          <div className="card" style={{ padding: "1.5rem" }}>
            <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)", fontSize: "1.35rem" }}>Members</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Kill criteria: a second human can be invited and pay under a limit.
            </p>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 7rem 7rem auto" }}>
              <input placeholder="0x invitee" value={inviteAddress} onChange={(e) => setInviteAddress(e.target.value)} style={inputStyle} />
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)} style={inputStyle}>
                <option value="admin">admin</option>
                <option value="payer">payer</option>
                <option value="viewer">viewer</option>
              </select>
              <input
                placeholder="Limit USD"
                value={inviteLimit}
                onChange={(e) => setInviteLimit(e.target.value)}
                disabled={inviteRole === "viewer"}
                style={inputStyle}
              />
              <button className="btn btn-primary" type="button" onClick={inviteMember}>
                Invite
              </button>
            </div>
            <table style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Role</th>
                  <th>Spend limit</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.address}>
                    <td>
                      {m.address.slice(0, 6)}…{m.address.slice(-4)}
                    </td>
                    <td>{m.role}</td>
                    <td>{m.spendLimitUsd ? `${(Number(m.spendLimitUsd) / 1e6).toLocaleString()} USDC` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ padding: "1.5rem" }}>
            <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)", fontSize: "1.35rem" }}>Payees</h2>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr auto" }}>
              <input placeholder="Label" value={payeeLabel} onChange={(e) => setPayeeLabel(e.target.value)} style={inputStyle} />
              <input placeholder="0x address" value={payeeAddress} onChange={(e) => setPayeeAddress(e.target.value)} style={inputStyle} />
              <button className="btn btn-primary" type="button" onClick={addPayee}>
                Save
              </button>
            </div>
            <ul style={{ marginTop: 16, paddingLeft: 18 }}>
              {payeeList.map((p) => (
                <li key={p.id}>
                  <strong>{p.label}</strong> — {p.address.slice(0, 6)}…{p.address.slice(-4)} ({p.defaultToken}){" "}
                  <a href={`/app/pay?payee=${p.address}`}>Pay</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="card" style={{ padding: "1.5rem" }}>
            <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)", fontSize: "1.35rem" }}>Export</h2>
            <a
              className="btn btn-secondary"
              href="#"
              onClick={async (e) => {
                e.preventDefault();
                if (!signedIn || !selectedOrg) return;
                const res = await fetch(`${API_BASE}/v1/activity.csv?orgId=${selectedOrg}`, {
                  credentials: "include",
                });
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "pairband-activity.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download CSV
            </a>
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              Viewer role can export; payer/admin can pay within limits.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "0.7rem 0.85rem",
  background: "#fffdf8",
};
