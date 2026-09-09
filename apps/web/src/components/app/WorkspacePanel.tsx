"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { API_ORIGIN } from "@/lib/api";

type MeResponse = {
  address: string;
  orgs: Array<{
    id: string;
    name: string;
    role: string;
    defaultBandBps: number;
    spendLimitUsd: string | null;
  }>;
};

type Member = { address: string; role: string; spendLimitUsd: string | null; active: boolean };
type Payee = { id: string; address: string; label: string; defaultToken: string };

async function api<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json");
  if (init?.token) headers.set("x-session-token", init.token);
  const res = await fetch(`${API_ORIGIN}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `http_${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function WorkspacePanel() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [token, setToken] = useState<string | null>(null);
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

  const refreshMe = useCallback(
    async (sessionToken: string) => {
      const data = await api<MeResponse>("/v1/me", { token: sessionToken });
      setMe(data);
      if (!selectedOrg && data.orgs[0]) setSelectedOrg(data.orgs[0].id);
      return data;
    },
    [selectedOrg],
  );

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("pairband_session") : null;
    if (saved) {
      setToken(saved);
      refreshMe(saved).catch(() => {
        localStorage.removeItem("pairband_session");
        setToken(null);
      });
    }
  }, [refreshMe]);

  useEffect(() => {
    if (!token || !selectedOrg) return;
    Promise.all([
      api<{ items: Member[] }>(`/v1/orgs/${selectedOrg}/members`, { token }),
      api<{ items: Payee[] }>(`/v1/orgs/${selectedOrg}/payees`, { token }),
    ])
      .then(([m, p]) => {
        setMembers(m.items);
        setPayeeList(p.items);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "load_failed"));
  }, [token, selectedOrg]);

  async function signIn() {
    setError("");
    if (!address) return;
    try {
      const { message } = await api<{ message: string }>("/v1/auth/nonce", {
        method: "POST",
        body: JSON.stringify({ address }),
      });
      const signature = await signMessageAsync({ message });
      const verified = await api<{ token: string }>("/v1/auth/verify", {
        method: "POST",
        body: JSON.stringify({ address, message, signature }),
      });
      localStorage.setItem("pairband_session", verified.token);
      setToken(verified.token);
      await refreshMe(verified.token);
      setStatus("Signed in.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "sign_in_failed");
    }
  }

  async function createOrg() {
    if (!token) return;
    setError("");
    try {
      const org = await api<{ id: string }>("/v1/orgs", {
        method: "POST",
        token,
        body: JSON.stringify({ name: orgName }),
      });
      setSelectedOrg(org.id);
      await refreshMe(token);
      setStatus(`Workspace “${orgName}” created.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "create_failed");
    }
  }

  async function inviteMember() {
    if (!token || !selectedOrg) return;
    setError("");
    try {
      await api(`/v1/orgs/${selectedOrg}/members`, {
        method: "POST",
        token,
        body: JSON.stringify({
          address: inviteAddress,
          role: inviteRole,
          spendLimitUsd: inviteRole === "viewer" ? null : String(Math.round(Number(inviteLimit) * 1e6)),
        }),
      });
      const m = await api<{ items: Member[] }>(`/v1/orgs/${selectedOrg}/members`, { token });
      setMembers(m.items);
      setStatus("Member invited — they can sign in with that wallet.");
      setInviteAddress("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "invite_failed");
    }
  }

  async function addPayee() {
    if (!token || !selectedOrg) return;
    setError("");
    try {
      await api(`/v1/orgs/${selectedOrg}/payees`, {
        method: "POST",
        token,
        body: JSON.stringify({ address: payeeAddress, label: payeeLabel, defaultToken: "USDC" }),
      });
      const p = await api<{ items: Payee[] }>(`/v1/orgs/${selectedOrg}/payees`, { token });
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
        {!token ? (
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

      {token ? (
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

      {token && selectedOrg ? (
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
                if (!token || !selectedOrg) return;
                const res = await fetch(`${API_ORIGIN}/v1/activity.csv?orgId=${selectedOrg}`, {
                  headers: { "x-session-token": token },
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
