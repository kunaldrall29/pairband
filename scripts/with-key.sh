#!/usr/bin/env bash
# Load repo .env then packages/contracts/.env and run a forge script with PRIVATE_KEY.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
set -a
# shellcheck disable=SC1091
[[ -f "$ROOT/.env" ]] && source "$ROOT/.env"
# shellcheck disable=SC1091
[[ -f "$ROOT/packages/contracts/.env" ]] && source "$ROOT/packages/contracts/.env"
set +a

if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "PRIVATE_KEY missing. Copy .env.example → .env (gitignored)." >&2
  exit 1
fi

CMD="${1:-}"
shift || true
cd "$ROOT/packages/contracts"

case "$CMD" in
  deploy-anvil)
    forge script script/Deploy.s.sol:DeployScript \
      --rpc-url "${ANVIL_RPC_URL:-http://127.0.0.1:8545}" \
      --broadcast --private-key "$PRIVATE_KEY" --via-ir -vv "$@"
    ;;
  deploy-sepolia)
    forge script script/Deploy.s.sol:DeployScript \
      --rpc-url "${UNICHAIN_SEPOLIA_RPC_URL:?set UNICHAIN_SEPOLIA_RPC_URL}" \
      --broadcast --private-key "$PRIVATE_KEY" --via-ir -vv "$@"
    ;;
  demo-anvil)
    forge script script/Demo.s.sol:DemoScript \
      --rpc-url "${ANVIL_RPC_URL:-http://127.0.0.1:8545}" \
      --broadcast --private-key "$PRIVATE_KEY" --via-ir -vv "$@"
    ;;
  address)
    cast wallet address --private-key "$PRIVATE_KEY"
    ;;
  *)
    echo "Usage: $0 {deploy-anvil|deploy-sepolia|demo-anvil|address}" >&2
    exit 1
    ;;
esac
