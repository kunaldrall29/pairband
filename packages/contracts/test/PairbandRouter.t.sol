// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolModifyLiquidityTest} from "@uniswap/v4-core/src/test/PoolModifyLiquidityTest.sol";
import {Constants} from "@uniswap/v4-core/test/utils/Constants.sol";

import {SeriesFactory} from "../src/SeriesFactory.sol";
import {SeriesVault} from "../src/SeriesVault.sol";
import {ClaimToken} from "../src/ClaimToken.sol";
import {MockERC20} from "./MockERC20.sol";
import {PairbandLifecycleHook} from "../src/hooks/PairbandLifecycleHook.sol";
import {MarketLauncher} from "../src/MarketLauncher.sol";
import {HookMiner} from "../src/libraries/HookMiner.sol";
import {PairbandRouter} from "../src/PairbandRouter.sol";
import {PairbandQuoter} from "../src/PairbandQuoter.sol";

contract PairbandRouterTest is Test {
    using PoolIdLibrary for PoolKey;

    uint160 constant SQRT_PRICE_1_1 = Constants.SQRT_PRICE_1_1;

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
    PairbandQuoter quoter;

    address writer = address(0xA11CE);
    address buyer = address(0xB0B);
    address seller = address(0x5E11);
    address feeRecipient = address(0xFEE);
    address lp;

    uint64 tradingStart = 1_000;
    uint64 exerciseStart = 2_000;
    uint64 exerciseEnd = 3_000;

    PoolKey key;

    function setUp() public {
        lp = makeAddr("lp");
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
        (, bytes32 salt) = HookMiner.find(address(this), flags, type(PairbandLifecycleHook).creationCode, ctorArgs);
        hook = new PairbandLifecycleHook{salt: salt}(IPoolManager(address(manager)));
        launcher = new MarketLauncher(IPoolManager(address(manager)), hook, address(factory), address(this));
        hook.setMarketLauncher(address(launcher));

        modifyLiquidityRouter = new PoolModifyLiquidityTest(IPoolManager(address(manager)));
        router = new PairbandRouter(IPoolManager(address(manager)), hook);
        quoter = new PairbandQuoter(IPoolManager(address(manager)), hook);

        usdc.mint(writer, 200_000_000e6);
        usdc.mint(lp, 200_000_000e6);
        usdc.mint(buyer, 100_000_000e6);

        vm.prank(writer);
        usdc.approve(address(vault), type(uint256).max);

        vm.warp(tradingStart);
        vm.prank(writer);
        vault.mint(100_000_000);

        ClaimToken long = vault.longToken();
        vm.prank(writer);
        long.transfer(lp, 50_000_000);
        vm.prank(writer);
        long.transfer(seller, 10_000_000);

        _approve(address(long), lp);
        _approve(address(usdc), lp);

        vm.prank(buyer);
        usdc.approve(address(router), type(uint256).max);
        vm.prank(seller);
        long.approve(address(router), type(uint256).max);

        launcher.registerAndInitializeDefault(address(vault), SQRT_PRICE_1_1);
        key = hook.getPoolKey(hook.poolIdBySeries(seriesId));

        vm.prank(lp);
        modifyLiquidityRouter.modifyLiquidity(
            key,
            ModifyLiquidityParams({tickLower: -60, tickUpper: 60, liquidityDelta: 5e9, salt: bytes32(0)}),
            ""
        );
    }

    function _approve(address token, address who) internal {
        vm.startPrank(who);
        MockERC20(token).approve(address(modifyLiquidityRouter), type(uint256).max);
        MockERC20(token).approve(address(manager), type(uint256).max);
        vm.stopPrank();
    }

    function test_buyExactOutput_fullFill() public {
        uint256 units = 100_000;
        uint256 vaultBefore = vault.accountedUSDC6();
        uint256 buyerUsdcBefore = usdc.balanceOf(buyer);
        uint256 buyerLongBefore = vault.longToken().balanceOf(buyer);

        vm.prank(buyer);
        uint256 paid = router.buyExactOutput(seriesId, units, 1_000_000e6, block.timestamp + 60);

        assertEq(vault.longToken().balanceOf(buyer), buyerLongBefore + units);
        assertEq(usdc.balanceOf(buyer), buyerUsdcBefore - paid);
        assertGt(paid, 0);
        assertEq(vault.accountedUSDC6(), vaultBefore);
        assertEq(usdc.balanceOf(address(router)), 0);
        assertEq(vault.longToken().balanceOf(address(router)), 0);
    }

    function test_sellExactInput_fullFill() public {
        uint256 units = 100_000;
        uint256 sellerUsdcBefore = usdc.balanceOf(seller);
        uint256 sellerLongBefore = vault.longToken().balanceOf(seller);

        vm.prank(seller);
        uint256 received = router.sellExactInput(seriesId, units, 0, block.timestamp + 60);

        assertEq(vault.longToken().balanceOf(seller), sellerLongBefore - units);
        assertEq(usdc.balanceOf(seller), sellerUsdcBefore + received);
        assertGt(received, 0);
    }

    function test_buySlippageReverts() public {
        vm.prank(buyer);
        vm.expectRevert();
        router.buyExactOutput(seriesId, 100_000, 1, block.timestamp + 60);
    }

    function test_sellSlippageReverts() public {
        vm.prank(seller);
        vm.expectRevert();
        router.sellExactInput(seriesId, 100_000, type(uint256).max / 2, block.timestamp + 60);
    }

    function test_deadlineExpired() public {
        vm.prank(buyer);
        vm.expectRevert(PairbandRouter.DeadlineExpired.selector);
        router.buyExactOutput(seriesId, 100_000, 1e18, block.timestamp - 1);
    }

    function test_rejectMsgValue() public {
        vm.deal(buyer, 1 ether);
        vm.prank(buyer);
        vm.expectRevert(PairbandRouter.NativeValueNotAllowed.selector);
        router.buyExactOutput{value: 1}(seriesId, 100_000, 1e18, block.timestamp + 60);
    }

    function test_stalePhaseReverts() public {
        vm.warp(exerciseStart);
        vm.prank(buyer);
        vm.expectRevert(PairbandRouter.TradingDisabled.selector);
        router.buyExactOutput(seriesId, 100_000, 1e18, block.timestamp + 60);
    }

    function test_pauseReverts() public {
        factory.setNewRiskPaused(seriesId, true);
        vm.prank(buyer);
        vm.expectRevert(PairbandRouter.TradingDisabled.selector);
        router.buyExactOutput(seriesId, 100_000, 1e18, block.timestamp + 60);
    }

    function test_forgedCallbackRejected() public {
        vm.expectRevert(PairbandRouter.NotPoolManager.selector);
        router.unlockCallback(abi.encode(key));
    }

    function test_zeroAmountReverts() public {
        vm.prank(buyer);
        vm.expectRevert(PairbandRouter.ZeroAmount.selector);
        router.buyExactOutput(seriesId, 0, 1e18, block.timestamp + 60);
    }

    function test_quoteBuyDecode() public {
        try quoter.quoteBuy(seriesId, 50_000) {
            fail("expected QuoteResult revert");
        } catch (bytes memory err) {
            bytes4 sel;
            assembly {
                sel := mload(add(err, 0x20))
            }
            assertEq(sel, PairbandQuoter.QuoteResult.selector);
            bytes memory payload = new bytes(err.length - 4);
            for (uint256 i = 4; i < err.length; i++) {
                payload[i - 4] = err[i];
            }
            (uint256 usdc6, uint256 units, bool isBuy, bytes32 poolId, uint256 bn) =
                abi.decode(payload, (uint256, uint256, bool, bytes32, uint256));
            assertEq(units, 50_000);
            assertTrue(isBuy);
            assertGt(usdc6, 0);
            assertEq(poolId, PoolId.unwrap(key.toId()));
            assertEq(bn, block.number);

            vm.prank(buyer);
            uint256 paid = router.buyExactOutput(seriesId, 50_000, usdc6 + 1, block.timestamp + 60);
            assertLe(paid, usdc6 + 1);
        }
    }

    function test_bothSortOrders_priceConversionSanity() public view {
        address long = address(vault.longToken());
        address settlement = address(usdc);
        bool longIs0 = long < settlement;
        assertTrue(Currency.unwrap(key.currency0) < Currency.unwrap(key.currency1));
        if (longIs0) {
            assertEq(Currency.unwrap(key.currency0), long);
            assertEq(Currency.unwrap(key.currency1), settlement);
        } else {
            assertEq(Currency.unwrap(key.currency0), settlement);
            assertEq(Currency.unwrap(key.currency1), long);
        }
        assertEq(vault.longToken().decimals(), 6);
        assertEq(usdc.decimals(), 6);
    }

    function test_insufficientLiquidityPartialFillReverts() public {
        vm.prank(buyer);
        vm.expectRevert();
        router.buyExactOutput(seriesId, 1_000_000_000_000, type(uint128).max, block.timestamp + 60);
    }
}
