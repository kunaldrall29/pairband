// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolModifyLiquidityTest} from "@uniswap/v4-core/src/test/PoolModifyLiquidityTest.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {Constants} from "@uniswap/v4-core/test/utils/Constants.sol";

import {SeriesFactory} from "../src/SeriesFactory.sol";
import {SeriesVault} from "../src/SeriesVault.sol";
import {ClaimToken} from "../src/ClaimToken.sol";
import {MockERC20} from "./MockERC20.sol";
import {PairbandLifecycleHook} from "../src/hooks/PairbandLifecycleHook.sol";
import {MarketLauncher} from "../src/MarketLauncher.sol";
import {HookMiner} from "../src/libraries/HookMiner.sol";

contract PairbandLifecycleHookTest is Test {
    using PoolIdLibrary for PoolKey;

    uint160 constant SQRT_PRICE_1_1 = Constants.SQRT_PRICE_1_1;
    uint24 constant FEE = 3000;
    int24 constant TICK_SPACING = 60;

    MockERC20 usdc;
    MockERC20 eurc;
    SeriesFactory factory;
    SeriesVault vault;
    bytes32 seriesId;

    PoolManager manager;
    PairbandLifecycleHook hook;
    MarketLauncher launcher;
    PoolModifyLiquidityTest modifyLiquidityRouter;
    PoolSwapTest swapRouter;

    address writer = address(0xA11CE);
    address buyer = address(0xB0B);
    address feeRecipient = address(0xFEE);
    address lp = makeAddr("lp");

    uint64 tradingStart = 1_000;
    uint64 exerciseStart = 2_000;
    uint64 exerciseEnd = 3_000;

    PoolKey key;
    PoolId poolId;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        eurc = new MockERC20("Euro Coin", "EURC", 6);
        factory = new SeriesFactory(address(eurc), address(usdc), address(this));

        SeriesFactory.CreateParams memory p = SeriesFactory.CreateParams({
            strikePerUnit6: 110,
            tradingStart: tradingStart,
            exerciseStart: exerciseStart,
            exerciseEnd: exerciseEnd,
            maxWriterUnits: 1e12,
            issuanceFeeBps: 10,
            feeRecipient: feeRecipient,
            longName: "PB EURC Put Long",
            longSymbol: "pbEURCp",
            receiptName: "PB Writer Receipt",
            receiptSymbol: "pbWR"
        });
        (seriesId,) = factory.createSeries(p);
        vault = SeriesVault(factory.vaultBySeriesId(seriesId));

        manager = new PoolManager(address(this));
        uint160 flags = uint160((1 << 13) | (1 << 11) | (1 << 7));
        bytes memory ctorArgs = abi.encode(manager);
        bytes memory creationCode = type(PairbandLifecycleHook).creationCode;
        (address hookAddr, bytes32 salt) = HookMiner.find(address(this), flags, creationCode, ctorArgs);

        hook = new PairbandLifecycleHook{salt: salt}(IPoolManager(address(manager)));
        assertEq(address(hook), hookAddr, "CREATE2 address");
        assertEq(uint160(address(hook)) & uint160((1 << 14) - 1), flags, "permission bits");
        assertEq(hook.PERMISSION_FLAGS(), flags, "permission constant");
        assertEq(address(hook.poolManager()), address(manager), "manager binding");

        launcher = new MarketLauncher(IPoolManager(address(manager)), hook, address(factory), address(this));
        hook.setMarketLauncher(address(launcher));

        modifyLiquidityRouter = new PoolModifyLiquidityTest(IPoolManager(address(manager)));
        swapRouter = new PoolSwapTest(IPoolManager(address(manager)));

        // Mint option inventory + USDC for LP/swaps
        usdc.mint(writer, 10_000_000e6);
        usdc.mint(lp, 10_000_000e6);
        usdc.mint(buyer, 10_000_000e6);
        eurc.mint(buyer, 10_000_000e6);

        vm.prank(writer);
        usdc.approve(address(vault), type(uint256).max);

        vm.warp(tradingStart);
        vm.prank(writer);
        vault.mint(20_000_000); // 20 whole options

        ClaimToken long = vault.longToken();
        vm.prank(writer);
        long.transfer(lp, 10_000_000);
        vm.prank(writer);
        long.transfer(buyer, 5_000_000);

        // Extra free USDC for LP (not vault-backed) — pool inventory is separate from collateral.
        usdc.mint(lp, 50_000_000e6);

        _approveAll(address(long), lp);
        _approveAll(address(usdc), lp);
        _approveAll(address(long), buyer);
        _approveAll(address(usdc), buyer);

        poolId = launcher.registerAndInitializeDefault(address(vault), SQRT_PRICE_1_1);
        key = hook.getPoolKey(poolId);
    }

    function _liqParams(int256 liquidityDelta) internal pure returns (ModifyLiquidityParams memory) {
        // Narrow band + modest L keeps 6-decimal token requirements within minted balances.
        return ModifyLiquidityParams({
            tickLower: -60,
            tickUpper: 60,
            liquidityDelta: liquidityDelta,
            salt: bytes32(0)
        });
    }

    function _approveAll(address token, address who) internal {
        vm.startPrank(who);
        MockERC20(token).approve(address(modifyLiquidityRouter), type(uint256).max);
        MockERC20(token).approve(address(swapRouter), type(uint256).max);
        MockERC20(token).approve(address(manager), type(uint256).max);
        vm.stopPrank();
    }

    function test_permissionMaskAndRuntimeCode() public view {
        assertTrue(address(hook).code.length > 0);
        assertEq(uint160(address(hook)) & uint160((1 << 14) - 1), uint160(Hooks.BEFORE_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_SWAP_FLAG));
    }

    function test_addLiquidityAndSwapInTrading() public {
        uint256 vaultUsdcBefore = vault.accountedUSDC6();

        vm.prank(lp);
        modifyLiquidityRouter.modifyLiquidity(
            key,
            _liqParams(1e9),
            ""
        );

        bool zeroForOne = Currency.unwrap(key.currency0) == address(vault.longToken());
        vm.prank(buyer);
        swapRouter.swap(
            key,
            SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -int256(100_000),
                sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
            }),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );

        assertEq(vault.accountedUSDC6(), vaultUsdcBefore, "hook must not move vault backing");
    }

    function test_removeLiquidityAfterTradingCutoff() public {
        vm.prank(lp);
        modifyLiquidityRouter.modifyLiquidity(
            key,
            _liqParams(1e9),
            ""
        );

        vm.warp(exerciseStart);
        assertEq(vault.phase(), 2);

        // Additions blocked
        vm.prank(lp);
        vm.expectRevert(); // WrappedError(HookCallFailed) around TradingDisabled
        modifyLiquidityRouter.modifyLiquidity(
            key,
            _liqParams(1e8),
            ""
        );

        // Removals still succeed (no beforeRemoveLiquidity hook)
        vm.prank(lp);
        modifyLiquidityRouter.modifyLiquidity(
            key,
            _liqParams(-1e9),
            ""
        );
    }

    function test_swapBlockedAfterTradingCutoff() public {
        vm.prank(lp);
        modifyLiquidityRouter.modifyLiquidity(
            key,
            _liqParams(1e9),
            ""
        );

        vm.warp(exerciseStart);
        bool zeroForOne = Currency.unwrap(key.currency0) == address(vault.longToken());
        vm.prank(buyer);
        vm.expectRevert(); // WrappedError(HookCallFailed) around TradingDisabled
        swapRouter.swap(
            key,
            SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -int256(10_000),
                sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
            }),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );
    }

    function test_newRiskPauseBlocksSwapAndAdd() public {
        vm.prank(lp);
        modifyLiquidityRouter.modifyLiquidity(
            key,
            _liqParams(1e9),
            ""
        );

        factory.setNewRiskPaused(seriesId, true);

        vm.prank(lp);
        vm.expectRevert(); // WrappedError(HookCallFailed) around TradingDisabled
        modifyLiquidityRouter.modifyLiquidity(
            key,
            _liqParams(1e8),
            ""
        );

        bool zeroForOne = Currency.unwrap(key.currency0) == address(vault.longToken());
        vm.prank(buyer);
        vm.expectRevert(); // WrappedError(HookCallFailed) around TradingDisabled
        swapRouter.swap(
            key,
            SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -int256(10_000),
                sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
            }),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );
    }

    function test_unauthorizedCallbackReverts() public {
        vm.expectRevert(PairbandLifecycleHook.NotPoolManager.selector);
        hook.beforeInitialize(address(launcher), key, SQRT_PRICE_1_1);
    }

    function test_wrongPriceInitializeReverts() public {
        // New series for a second market attempt with mismatched price via direct manager call after register
        SeriesFactory.CreateParams memory p = SeriesFactory.CreateParams({
            strikePerUnit6: 120,
            tradingStart: tradingStart,
            exerciseStart: exerciseStart,
            exerciseEnd: exerciseEnd,
            maxWriterUnits: 1e12,
            issuanceFeeBps: 0,
            feeRecipient: feeRecipient,
            longName: "PB2",
            longSymbol: "pb2",
            receiptName: "WR2",
            receiptSymbol: "wr2"
        });
        (, address vault2Addr) = factory.createSeries(p);
        SeriesVault vault2 = SeriesVault(vault2Addr);

        // Register only through hook (as launcher), then try wrong price init as launcher via manager
        vm.prank(address(launcher));
        PoolId id2 = hook.registerMarket(address(vault2), FEE, TICK_SPACING, SQRT_PRICE_1_1, address(factory));
        PoolKey memory key2 = hook.getPoolKey(id2);

        vm.prank(address(launcher));
        vm.expectRevert(); // PriceMismatch bubbling through hook
        manager.initialize(key2, Constants.SQRT_PRICE_2_1);
    }

    function test_duplicateSeriesPoolReverts() public {
        vm.expectRevert(PairbandLifecycleHook.DuplicateSeriesPool.selector);
        launcher.registerAndInitializeDefault(address(vault), SQRT_PRICE_1_1);
    }

    function test_mismatchedFeeKeyRejectedOnInit() public {
        SeriesFactory.CreateParams memory p = SeriesFactory.CreateParams({
            strikePerUnit6: 130,
            tradingStart: tradingStart,
            exerciseStart: exerciseStart,
            exerciseEnd: exerciseEnd,
            maxWriterUnits: 1e12,
            issuanceFeeBps: 0,
            feeRecipient: feeRecipient,
            longName: "PB3",
            longSymbol: "pb3",
            receiptName: "WR3",
            receiptSymbol: "wr3"
        });
        (, address vault3Addr) = factory.createSeries(p);

        vm.prank(address(launcher));
        PoolId id3 = hook.registerMarket(vault3Addr, FEE, TICK_SPACING, SQRT_PRICE_1_1, address(factory));
        PoolKey memory good = hook.getPoolKey(id3);
        PoolKey memory bad = good;
        bad.fee = 500;

        vm.prank(address(launcher));
        vm.expectRevert(); // UnknownMarket / KeyMismatch path — unregistered key id
        manager.initialize(bad, SQRT_PRICE_1_1);
    }

    function test_boundaries_scheduledAndMaturedBlockTradingOps() public {
        vm.prank(lp);
        modifyLiquidityRouter.modifyLiquidity(
            key,
            _liqParams(1e9),
            ""
        );

        vm.warp(tradingStart - 1);
        // phase 0 — but pool already initialized in trading; ops should fail if we rewind
        // Rewinding after init is artificial; create fresh market for scheduled case
        SeriesFactory.CreateParams memory p = SeriesFactory.CreateParams({
            strikePerUnit6: 140,
            tradingStart: tradingStart + 10_000,
            exerciseStart: exerciseStart + 10_000,
            exerciseEnd: exerciseEnd + 10_000,
            maxWriterUnits: 1e12,
            issuanceFeeBps: 0,
            feeRecipient: feeRecipient,
            longName: "PB4",
            longSymbol: "pb4",
            receiptName: "WR4",
            receiptSymbol: "wr4"
        });
        (, address vault4Addr) = factory.createSeries(p);
        PoolId id4 = launcher.registerAndInitializeDefault(vault4Addr, SQRT_PRICE_1_1);
        PoolKey memory key4 = hook.getPoolKey(id4);

        // still before tradingStart+10000
        vm.warp(tradingStart + 5_000);
        assertEq(SeriesVault(vault4Addr).phase(), 0);

        ClaimToken long4 = SeriesVault(vault4Addr).longToken();
        // cannot mint before trading; seed tokens by warping briefly then back — use deal/mint via vault after warp
        vm.warp(tradingStart + 10_000);
        usdc.mint(writer, 1_000_000e6);
        vm.prank(writer);
        usdc.approve(vault4Addr, type(uint256).max);
        vm.prank(writer);
        SeriesVault(vault4Addr).mint(1_000_000);
        vm.prank(writer);
        long4.transfer(lp, 500_000);
        _approveAll(address(long4), lp);

        // back to scheduled
        vm.warp(tradingStart + 5_000);
        vm.prank(lp);
        vm.expectRevert(); // WrappedError(HookCallFailed) around TradingDisabled
        modifyLiquidityRouter.modifyLiquidity(
            key4,
            _liqParams(1e9),
            ""
        );

        // matured on original pool
        vm.warp(exerciseEnd);
        assertEq(vault.phase(), 3);
        bool zeroForOne = Currency.unwrap(key.currency0) == address(vault.longToken());
        vm.prank(buyer);
        vm.expectRevert(); // WrappedError(HookCallFailed) around TradingDisabled
        swapRouter.swap(
            key,
            SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -int256(1_000),
                sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
            }),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );
    }
}
