// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {PoolModifyLiquidityTest} from "@uniswap/v4-core/src/test/PoolModifyLiquidityTest.sol";
import {Constants} from "@uniswap/v4-core/test/utils/Constants.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";

import {SeriesFactory} from "../src/SeriesFactory.sol";
import {SeriesVault} from "../src/SeriesVault.sol";
import {ClaimToken} from "../src/ClaimToken.sol";
import {MockERC20} from "./MockERC20.sol";
import {PairbandLifecycleHook} from "../src/hooks/PairbandLifecycleHook.sol";
import {MarketLauncher} from "../src/MarketLauncher.sol";
import {HookMiner} from "../src/libraries/HookMiner.sol";
import {OptionTickMath} from "../src/libraries/OptionTickMath.sol";
import {PairbandRouter} from "../src/PairbandRouter.sol";

/// @notice Maker/LP fixture: writer collateral stays in vault; LP inventory is separate free balances.
/// @dev Uses PoolModifyLiquidityTest as a lightweight stand-in; see PositionManagerE2E for real POSM NFT path.
///      Label: Pairband-deployed fixture — not official Uniswap on Arc.
contract MakerLpLifecycleTest is Test {
    using PoolIdLibrary for PoolKey;

    MockERC20 usdc;
    MockERC20 eurc;
    SeriesFactory factory;
    SeriesVault vault;
    bytes32 seriesId;
    PoolManager manager;
    PairbandLifecycleHook hook;
    MarketLauncher launcher;
    PoolModifyLiquidityTest modifyLiquidityRouter;
    PairbandRouter router;

    address writer = address(0xA11CE);
    address buyer = address(0xB0B);
    address maker;
    address feeRecipient = address(0xFEE);

    uint64 tradingStart = 1_000;
    uint64 exerciseStart = 2_000;
    uint64 exerciseEnd = 3_000;
    PoolKey key;

    function setUp() public {
        maker = makeAddr("maker");
        usdc = new MockERC20("USD Coin", "USDC", 6);
        eurc = new MockERC20("Euro Coin", "EURC", 6);
        factory = new SeriesFactory(address(eurc), address(usdc), address(this));

        (seriesId,) = factory.createSeries(
            SeriesFactory.CreateParams({
                strikePerUnit6: 110,
                tradingStart: tradingStart,
                exerciseStart: exerciseStart,
                exerciseEnd: exerciseEnd,
                maxWriterUnits: 1e12,
                issuanceFeeBps: 0,
                feeRecipient: feeRecipient,
                longName: "PB Long",
                longSymbol: "pbL",
                receiptName: "PB WR",
                receiptSymbol: "pbW"
            })
        );
        vault = SeriesVault(factory.vaultBySeriesId(seriesId));

        manager = new PoolManager(address(this));
        uint160 flags = uint160((1 << 13) | (1 << 11) | (1 << 7));
        (, bytes32 salt) =
            HookMiner.find(address(this), flags, type(PairbandLifecycleHook).creationCode, abi.encode(manager));
        hook = new PairbandLifecycleHook{salt: salt}(IPoolManager(address(manager)));
        launcher = new MarketLauncher(IPoolManager(address(manager)), hook, address(factory), address(this));
        hook.setMarketLauncher(address(launcher));
        modifyLiquidityRouter = new PoolModifyLiquidityTest(IPoolManager(address(manager)));
        router = new PairbandRouter(IPoolManager(address(manager)), hook);

        usdc.mint(writer, 200_000_000e6);
        usdc.mint(maker, 200_000_000e6);
        usdc.mint(buyer, 50_000_000e6);
        vm.prank(writer);
        usdc.approve(address(vault), type(uint256).max);

        vm.warp(tradingStart);
        vm.prank(writer);
        vault.mint(80_000_000);

        ClaimToken long = vault.longToken();
        // Writer keeps receipt; transfers free long inventory to maker (separate from vault backing).
        uint256 writerReceipt = vault.writerReceipt().balanceOf(writer);
        assertEq(writerReceipt, 80_000_000);

        vm.prank(writer);
        long.transfer(maker, 40_000_000);

        vm.startPrank(maker);
        long.approve(address(modifyLiquidityRouter), type(uint256).max);
        usdc.approve(address(modifyLiquidityRouter), type(uint256).max);
        vm.stopPrank();
        vm.prank(buyer);
        usdc.approve(address(router), type(uint256).max);

        bool longIs0 = address(long) < address(usdc);
        // Use 1:1 raw init for reliable LP amounts; OptionTickMath covered in unit test.
        longIs0;
        launcher.registerAndInitializeDefault(address(vault), Constants.SQRT_PRICE_1_1);
        key = hook.getPoolKey(hook.poolIdBySeries(seriesId));

        vm.prank(maker);
        modifyLiquidityRouter.modifyLiquidity(
            key,
            ModifyLiquidityParams({tickLower: -60, tickUpper: 60, liquidityDelta: 2e9, salt: bytes32(0)}),
            ""
        );
    }

    function test_writerReceiptIndependentOfLpInventory() public view {
        assertEq(vault.writerReceipt().balanceOf(writer), 80_000_000);
        assertGt(vault.longToken().balanceOf(maker), 0);
        // Maker may have spent some longs into the pool; receipt never moves with LP.
        assertEq(vault.writerReceipt().balanceOf(maker), 0);
    }

    function test_tradeAgainstMakerThenExitAfterCutoff() public {
        uint256 vaultUsdc = vault.accountedUSDC6();
        vm.prank(buyer);
        router.buyExactOutput(seriesId, 50_000, 1_000_000e6, block.timestamp + 60);
        assertEq(vault.accountedUSDC6(), vaultUsdc, "LP/router must not touch vault");

        // Snapshot maker free balances before remove
        uint256 longBefore = vault.longToken().balanceOf(maker);
        uint256 usdcBefore = usdc.balanceOf(maker);

        vm.warp(exerciseStart);
        assertEq(vault.phase(), 2);

        int24 lower = -60;
        int24 upper = 60;

        vm.prank(maker);
        vm.expectRevert();
        modifyLiquidityRouter.modifyLiquidity(
            key, ModifyLiquidityParams({tickLower: lower, tickUpper: upper, liquidityDelta: 1e8, salt: bytes32(0)}), ""
        );

        vm.prank(maker);
        modifyLiquidityRouter.modifyLiquidity(
            key, ModifyLiquidityParams({tickLower: lower, tickUpper: upper, liquidityDelta: -2e9, salt: bytes32(0)}), ""
        );

        assertGe(vault.longToken().balanceOf(maker) + usdc.balanceOf(maker), longBefore + usdcBefore - 1);
        // Fee collect alone is not exercise — buyer still holds options through exercise window.
        assertGt(vault.longToken().balanceOf(buyer), 0);
    }

    function test_tickMathBothSortOrders() public pure {
        uint160 a = OptionTickMath.sqrtPriceX96FromUsdcPerWhole(120_000, true);
        uint160 b = OptionTickMath.sqrtPriceX96FromUsdcPerWhole(120_000, false);
        assertTrue(a > 0 && b > 0 && a != b);
        int24 t0 = OptionTickMath.tickFromUsdcPerWhole(120_000, true, 60);
        int24 t1 = OptionTickMath.tickFromUsdcPerWhole(120_000, false, 60);
        assertTrue(t0 != t1);
    }
}
