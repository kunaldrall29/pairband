// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {HookMiner} from "@uniswap/v4-periphery/test/shared/HookMiner.sol";

import {PairbandHook} from "../src/PairbandHook.sol";
import {PairbandFactory} from "../src/PairbandFactory.sol";

/// @notice Mine hook salt via CREATE2 deployer proxy, deploy hook + factory, print addresses.
/// @dev Factory address is predicted as CREATE(EOA, nonce+1) after the hook CREATE2 tx (nonce N).
contract DeployScript is Script {
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external {
        address poolManager = vm.envAddress("POOL_MANAGER");
        address positionManager = vm.envOr("POSITION_MANAGER", address(0));
        address protocolFeeRecipient = vm.envOr("PROTOCOL_FEE_RECIPIENT", msg.sender);
        address owner = vm.envOr("FACTORY_OWNER", msg.sender);

        uint160 flags = uint160(
            Hooks.BEFORE_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_REMOVE_LIQUIDITY_FLAG
                | Hooks.AFTER_SWAP_FLAG
        );

        // Broadcast account: first tx = hook CREATE2 (nonce N), second = factory CREATE (nonce N+1).
        address deployer = msg.sender;
        uint64 nonce = vm.getNonce(deployer);
        address predictedFactory = vm.computeCreateAddress(deployer, nonce + 1);

        bytes memory creationCode = type(PairbandHook).creationCode;
        bytes memory ctorArgs = abi.encode(poolManager, predictedFactory, positionManager);
        (address hookAddr, bytes32 salt) =
            HookMiner.find(CREATE2_DEPLOYER, flags, creationCode, ctorArgs);

        bytes memory initCode = abi.encodePacked(creationCode, ctorArgs);

        vm.startBroadcast();

        // Deploy hook through the canonical CREATE2 proxy.
        (bool ok,) = CREATE2_DEPLOYER.call(abi.encodePacked(salt, initCode));
        require(ok, "CREATE2 hook failed");
        PairbandHook hook = PairbandHook(hookAddr);
        require(uint160(address(hook)) & Hooks.ALL_HOOK_MASK == flags, "hook flags mismatch");

        PairbandFactory factory =
            new PairbandFactory(IPoolManager(poolManager), hook, positionManager, protocolFeeRecipient, owner);
        require(address(factory) == predictedFactory, "factory addr mismatch");

        vm.stopBroadcast();

        console2.log("PairbandHook", address(hook));
        console2.log("PairbandFactory", address(factory));
        console2.log("PoolManager", poolManager);
        console2.log("PositionManager", positionManager);
        console2.log("ProtocolFeeRecipient", protocolFeeRecipient);
        console2.log("Owner", owner);
        console2.logBytes32(salt);
    }
}
