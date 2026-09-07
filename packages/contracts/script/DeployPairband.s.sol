// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";

import {SeriesFactory} from "../src/SeriesFactory.sol";
import {PairbandLifecycleHook} from "../src/hooks/PairbandLifecycleHook.sol";
import {MarketLauncher} from "../src/MarketLauncher.sol";
import {PairbandRouter} from "../src/PairbandRouter.sol";
import {PairbandQuoter} from "../src/PairbandQuoter.sol";
import {HookMiner} from "../src/libraries/HookMiner.sol";

/**
 * @title DeployPairband
 * @notice Reviewable deployment script for Pairband options-v2 on Arc testnet.
 * @dev DEFAULT: dry-run / simulate only. Broadcast requires BOTH:
 *        1) env PAIRBAND_ALLOW_BROADCAST=1
 *        2) forge script ... --broadcast with a managed keystore (never --private-key)
 *
 *      Labels: Pairband-deployed PoolManager/hook/router — NOT official Uniswap on Arc.
 *      Mainnet: do not use this script. Mainnet config remains null.
 */
contract DeployPairband is Script {
    // Arc testnet ERC-20 USDC / EURC (reverified in O01/O10 read-only checks)
    address constant ARC_USDC = 0x3600000000000000000000000000000000000000;
    address constant ARC_EURC = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;
    address constant ARC_CREATE2 = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    address constant ARC_PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address constant ARC_MULTICALL3FROM = 0x522fAf9A91c41c443c66765030741e4AaCe147D0;

    uint160 constant HOOK_FLAGS = uint160((1 << 13) | (1 << 11) | (1 << 7));

    function run() external {
        address deployer = msg.sender;
        bool allowBroadcast = _envFlag("PAIRBAND_ALLOW_BROADCAST");

        console2.log("=== Pairband DeployPairband ===");
        console2.log("chainid", block.chainid);
        console2.log("deployer", deployer);
        console2.log("allowBroadcast", allowBroadcast);
        console2.log("USDC", ARC_USDC);
        console2.log("EURC", ARC_EURC);
        console2.log("CREATE2 factory", ARC_CREATE2);
        console2.log("Permit2", ARC_PERMIT2);
        console2.log("Multicall3From", ARC_MULTICALL3FROM);
        console2.log("hook flags", uint256(HOOK_FLAGS));

        if (block.chainid != 5042002 && allowBroadcast) {
            revert("broadcast only allowed on Arc testnet chainId 5042002");
        }

        if (!allowBroadcast) {
            console2.log("DRY-RUN: no broadcast. Set PAIRBAND_ALLOW_BROADCAST=1 and forge --broadcast to deploy.");
            _logBytecodeSizes();
            console2.log("POSM deferred: Arc has no WETH; see docs/evidence/o10/deployment-plan.md");
            return;
        }

        vm.startBroadcast();

        PoolManager manager = new PoolManager(deployer);
        console2.log("PoolManager", address(manager));

        (address hookAddr, bytes32 hookSalt) = HookMiner.find(
            deployer,
            HOOK_FLAGS,
            type(PairbandLifecycleHook).creationCode,
            abi.encode(IPoolManager(address(manager)))
        );
        PairbandLifecycleHook hook = new PairbandLifecycleHook{salt: hookSalt}(IPoolManager(address(manager)));
        require(address(hook) == hookAddr, "hook address mismatch");
        console2.log("PairbandLifecycleHook", address(hook));
        console2.log("hookSalt", uint256(hookSalt));

        SeriesFactory factory = new SeriesFactory(ARC_EURC, ARC_USDC, deployer);
        console2.log("SeriesFactory", address(factory));

        MarketLauncher launcher =
            new MarketLauncher(IPoolManager(address(manager)), hook, address(factory), deployer);
        console2.log("MarketLauncher", address(launcher));

        hook.setMarketLauncher(address(launcher));

        PairbandRouter router = new PairbandRouter(IPoolManager(address(manager)), hook);
        console2.log("PairbandRouter", address(router));

        PairbandQuoter quoter = new PairbandQuoter(IPoolManager(address(manager)), hook);
        console2.log("PairbandQuoter", address(quoter));

        vm.stopBroadcast();

        console2.log("POSM/PositionManager: NOT deployed in this script - requires WETH+descriptor plan (see o10 plan).");
        console2.log("DONE broadcast. Record tx hashes from forge broadcast JSON into deployments/arc-testnet.json.");
    }

    function _envFlag(string memory key) internal view returns (bool) {
        try vm.envString(key) returns (string memory v) {
            return keccak256(bytes(v)) == keccak256(bytes("1")) || keccak256(bytes(v)) == keccak256(bytes("true"));
        } catch {
            return false;
        }
    }

    function _logBytecodeSizes() internal pure {
        console2.log("creationCode bytes PoolManager", type(PoolManager).creationCode.length);
        console2.log("creationCode bytes Hook", type(PairbandLifecycleHook).creationCode.length);
        console2.log("creationCode bytes Factory", type(SeriesFactory).creationCode.length);
        console2.log("creationCode bytes Launcher", type(MarketLauncher).creationCode.length);
        console2.log("creationCode bytes Router", type(PairbandRouter).creationCode.length);
        console2.log("creationCode bytes Quoter", type(PairbandQuoter).creationCode.length);
    }
}
