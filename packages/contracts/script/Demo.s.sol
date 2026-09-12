// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";

import {PairbandFactory} from "../src/PairbandFactory.sol";
import {PairbandVault} from "../src/PairbandVault.sol";
import {PairbandHook} from "../src/PairbandHook.sol";

/// @notice End-to-end demo: create pair → deposit → propose → warp → execute → withdraw.
/// @dev Prints tx hashes / addresses for DEMO.md. Run after Deploy.s.sol on Anvil or Unichain Sepolia.
///      Env: FACTORY, TOKEN0, TOKEN1, CURATOR, AGENT (optional 0), PRIVATE_KEY via forge broadcast.
contract DemoScript is Script {
    function run() external {
        PairbandFactory factory = PairbandFactory(vm.envAddress("FACTORY"));
        address token0 = vm.envAddress("TOKEN0");
        address token1 = vm.envAddress("TOKEN1");
        require(token0 < token1, "token order");

        address curator = vm.envAddress("CURATOR");
        address agent = vm.envOr("AGENT", address(0));
        uint24 fee = uint24(vm.envOr("POOL_FEE", uint256(3000)));
        int24 spacing = int24(int256(vm.envOr("TICK_SPACING", uint256(60))));
        int24 tickLower = int24(int256(vm.envOr("TICK_LOWER", uint256(uint24(int24(-120))))));
        int24 tickUpper = int24(int256(vm.envOr("TICK_UPPER", uint256(120))));

        PairbandHook hook = factory.hook();

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: fee,
            tickSpacing: spacing,
            hooks: IHooks(address(hook))
        });

        PairbandVault.Policy memory policy = PairbandVault.Policy({
            curator: curator,
            agent: agent,
            maxWidth: 600,
            maxShift: 240,
            minCooldown: 1 hours,
            protocolFeeBps: 50,
            performanceFeeBps: 1000,
            proposalDelay: 1 hours
        });

        vm.startBroadcast();

        (PairbandVault vault,) = factory.createPairband(
            key,
            policy,
            TickMath.getSqrtPriceAtTick(0),
            "Pairband DEMO",
            "pb-DEMO",
            tickLower,
            tickUpper
        );
        console2.log("vault", address(vault));

        uint256 amount = vm.envOr("DEPOSIT_AMOUNT", uint256(1_000e6));
        IERC20(token0).approve(address(vault), amount);
        IERC20(token1).approve(address(vault), amount);
        (uint256 shares,) = vault.deposit(amount, amount, 0);
        console2.log("deposit shares", shares);

        // Propose a modest shift (curator or agent).
        int24 newLower = tickLower + spacing;
        int24 newUpper = tickUpper + spacing;
        vault.proposeRebalance(newLower, newUpper, 0, 0);
        console2.log("proposed", uint256(int256(newLower)), uint256(int256(newUpper)));

        vm.stopBroadcast();

        // Warp delay for local/anvil; on Sepolia use a second broadcast after waiting.
        if (block.chainid == 31337) {
            vm.warp(block.timestamp + 1 hours + 1);
            vm.startBroadcast();
            vault.executeRebalance();
            console2.log("executed rebalance");
            uint256 bal = vault.balanceOf(msg.sender);
            if (bal > 0) {
                vault.withdraw(bal / 2, 0, 0);
                console2.log("withdrew half shares", bal / 2);
            }
            vm.stopBroadcast();
        } else {
            console2.log("Wait proposalDelay then run DemoExecute.s.sol");
        }
    }
}
