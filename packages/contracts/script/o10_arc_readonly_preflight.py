#!/usr/bin/env python3
"""O10 Arc testnet read-only preflight. No broadcasts. No invented hashes."""

from __future__ import annotations

import hashlib
import json
import time
import urllib.request
from typing import Any

RPC = "https://rpc.testnet.arc.io"
CHAIN_ID = 5042002
USDC = "0x3600000000000000000000000000000000000000"
EURC = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a"
CREATE2 = "0x4e59b44847b379578588920cA78FbF26c0B4956C"
MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11"
MULTICALL3FROM = "0x522fAf9A91c41c443c66765030741e4AaCe147D0"
PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3"
MEMO = "0x5294E9927c3306DcBaDb03fe70b92e01cCede505"
BLOCKLISTED = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
GAS_FLOOR_WEI = 20_000_000_000  # 20 Gwei

# O01 recorded code sha256
O01_USDC_SHA = "0xd06405421b354a12b2f03fcc8aac4b324f274aed5b8ecc5fd62d8fa119067154"
O01_EURC_SHA = "0x971d3ebaa21004c98d41e2a98a24287e9b5bffa23cb93b64c4f5a71d119058a1"


def rpc(method: str, params: list[Any]) -> Any:
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    req = urllib.request.Request(
        RPC,
        data=body,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "pairband-o10-preflight/1.0",
            "Accept": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.loads(resp.read().decode())
    if "error" in payload:
        raise RuntimeError(payload["error"])
    return payload["result"]


def code_info(addr: str) -> dict[str, Any]:
    code = rpc("eth_getCode", [addr, "latest"])
    raw = bytes.fromhex(code[2:]) if code and code != "0x" else b""
    sha = "0x" + hashlib.sha256(raw).hexdigest() if raw else None
    return {
        "address": addr,
        "bytecodePresent": len(raw) > 0,
        "bytecodeLength": len(raw),
        "codeSha256": sha,
    }


def decimals(addr: str) -> int | None:
    # decimals() selector 0x313ce567
    data = "0x313ce567"
    try:
        out = rpc("eth_call", [{"to": addr, "data": data}, "latest"])
        return int(out, 16)
    except Exception as e:  # noqa: BLE001
        return None


def eth_balance(addr: str) -> str:
    return rpc("eth_getBalance", [addr, "latest"])


def main() -> None:
    checked_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    chain_hex = rpc("eth_chainId", [])
    chain_id = int(chain_hex, 16)
    block = rpc("eth_getBlockByNumber", ["latest", False])
    gas_price = int(rpc("eth_gasPrice", []), 16)
    max_priority = None
    try:
        max_priority = int(rpc("eth_maxPriorityFeePerGas", []), 16)
    except Exception:
        pass

    usdc = code_info(USDC)
    usdc["decimals"] = decimals(USDC)
    usdc["decimalsOk"] = usdc["decimals"] == 6
    usdc["matchesO01CodeSha"] = usdc["codeSha256"] == O01_USDC_SHA

    eurc = code_info(EURC)
    eurc["decimals"] = decimals(EURC)
    eurc["decimalsOk"] = eurc["decimals"] == 6
    eurc["matchesO01CodeSha"] = eurc["codeSha256"] == O01_EURC_SHA

    # Native balance read for USDC system address (gas token) vs ERC-20 — document dual model
    native_bal_sample = eth_balance("0x0000000000000000000000000000000000000001")

    # Blocklist address: read-only — do NOT send value. Record balance query only.
    blocklisted = {
        "address": BLOCKLISTED,
        "eth_getBalance": eth_balance(BLOCKLISTED),
        "note": "Value transfer to/from this address reverts on Arc; not exercised (no broadcast).",
    }

    report = {
        "schemaVersion": 1,
        "stage": "O10",
        "checkedAt": checked_at,
        "rpc": RPC,
        "broadcast": False,
        "broadcastAuthorization": "absent — dry-run / read-only only",
        "checks": {
            "chainId": {"value": chain_id, "expected": CHAIN_ID, "ok": chain_id == CHAIN_ID},
            "latestBlock": {
                "number": int(block["number"], 16),
                "hash": block["hash"],
                "timestamp": int(block["timestamp"], 16),
            },
            "gas": {
                "eth_gasPriceWei": gas_price,
                "eth_gasPriceGwei": gas_price / 1e9,
                "minBaseFeeFloorGwei": 20,
                "aboveFloor": gas_price >= GAS_FLOOR_WEI,
                "eth_maxPriorityFeePerGasWei": max_priority,
                "recommendation": "Set maxFeePerGas >= 20 Gwei; observed price may exceed floor",
            },
            "usdcErc20": usdc,
            "eurc": eurc,
            "nativeUsdcModel": {
                "nativeDecimals": 18,
                "erc20Decimals": 6,
                "sameFunds": True,
                "noWrappedUsdcOnArc": True,
                "sampleEthGetBalanceZeroAddrPlus1": native_bal_sample,
                "note": "Do not mix native 18-dec gas units with ERC-20 6-dec vault amounts",
            },
            "infrastructure": {
                "create2Factory": code_info(CREATE2),
                "multicall3": code_info(MULTICALL3),
                "multicall3From": code_info(MULTICALL3FROM),
                "permit2": code_info(PERMIT2),
                "memo": code_info(MEMO),
            },
            "blocklistFixture": blocklisted,
            "uniswapV4OfficialArc": {
                "status": "not_listed",
                "source": "https://developers.uniswap.org/docs/protocols/v4/deployments",
                "pairbandPath": "self-deploy PoolManager labeled Pairband-deployed testnet instance",
            },
            "weth": {
                "officialOnArc": False,
                "note": "Arc has no WETH; native USDC is already IERC20. POSM needs Pairband stub WETH or alternate periphery plan.",
            },
            "mainnet": {"verified": False, "chainId": None},
        },
    }

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
