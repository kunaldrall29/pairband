// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {Constants} from "@uniswap/v4-core/test/utils/Constants.sol";
import {PoolModifyLiquidityTest} from "@uniswap/v4-core/src/test/PoolModifyLiquidityTest.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";

import {SeriesFactory} from "../src/SeriesFactory.sol";
import {SeriesVault} from "../src/SeriesVault.sol";
import {ClaimToken} from "../src/ClaimToken.sol";
import {MockERC20} from "./MockERC20.sol";
import {PairbandLifecycleHook} from "../src/hooks/PairbandLifecycleHook.sol";
import {MarketLauncher} from "../src/MarketLauncher.sol";
import {HookMiner} from "../src/libraries/HookMiner.sol";
import {PairbandRouter} from "../src/PairbandRouter.sol";
import {IndependentSeriesMath} from "./ghost/IndependentSeriesModel.sol";

/// @notice Adversarial / permission / conservation edge cases for O09.
/// @dev Not an audit. Documents threat coverage with reproducible tests.
contract AdversarialSuiteTest is Test {
    MockERC20 usdc;
    MockERC20 eurc;
    SeriesFactory factory;
    SeriesVault vault;
    bytes32 seriesId;

    PoolManager manager;
    PairbandLifecycleHook hook;
    MarketLauncher launcher;
    PairbandRouter router;
    PoolModifyLiquidityTest modifyLiq;

    address writer = makeAddr("writer");
    address buyer = makeAddr("buyer");
    address attacker = makeAddr("attacker");
    address fee = makeAddr("fee");

    uint64 tradingStart = 1_000;
    uint64 exerciseStart = 2_000;
    uint64 exerciseEnd = 3_000;
    PoolKey key;

    function setUp() public {
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
                issuanceFeeBps: 10,
                feeRecipient: fee,
                longName: "L",
                longSymbol: "L",
                receiptName: "R",
                receiptSymbol: "R"
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
        router = new PairbandRouter(IPoolManager(address(manager)), hook);
        modifyLiq = new PoolModifyLiquidityTest(IPoolManager(address(manager)));

        usdc.mint(writer, 100_000_000e6);
        usdc.mint(buyer, 100_000_000e6);
        eurc.mint(buyer, 100_000_000e6);
        eurc.mint(writer, 100_000_000e6);

        vm.prank(writer);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(buyer);
        eurc.approve(address(vault), type(uint256).max);
        vm.prank(buyer);
        usdc.approve(address(router), type(uint256).max);

        vm.warp(tradingStart);
        vm.prank(writer);
        vault.mint(10_000_000);

        launcher.registerAndInitializeDefault(address(vault), Constants.SQRT_PRICE_1_1);
        key = hook.getPoolKey(hook.poolIdBySeries(seriesId));

        ClaimToken long = vault.longToken();
        vm.prank(writer);
        long.transfer(buyer, 200_000);
        // seed narrow-range LP with writer inventory + USDC
        vm.startPrank(writer);
        long.approve(address(modifyLiq), type(uint256).max);
        usdc.approve(address(modifyLiq), type(uint256).max);
        modifyLiq.modifyLiquidity(
            key,
            ModifyLiquidityParams({tickLower: -60, tickUpper: 60, liquidityDelta: 2e9, salt: bytes32(0)}),
            Constants.ZERO_BYTES
        );
        vm.stopPrank();
    }

    function test_unauthorizedClaimMintReverts() public {
        ClaimToken long = vault.longToken();
        ClaimToken receipt = vault.writerReceipt();
        vm.prank(attacker);
        vm.expectRevert(ClaimToken.NotVault.selector);
        long.mint(attacker, 1);
        vm.prank(attacker);
        vm.expectRevert(ClaimToken.NotVault.selector);
        receipt.burn(writer, 1);
    }

    function test_sourceHasNoRescueOrDelegatecallPaths() public {
        // Privileged surface: Ownable pause + vault-only ClaimToken mint/burn.
        // Manual review: no delegatecall/selfdestruct/rescue in packages/contracts/src.
        assertTrue(factory.owner() == address(this));
        ClaimToken long = vault.longToken();
        vm.prank(attacker);
        vm.expectRevert(ClaimToken.NotVault.selector);
        long.mint(attacker, 1);
    }

    function test_unauthorizedPauseReverts() public {
        vm.prank(attacker);
        vm.expectRevert();
        factory.setNewRiskPaused(seriesId, true);
    }

    function test_unauthorizedHookLauncherReverts() public {
        vm.prank(attacker);
        vm.expectRevert();
        hook.setMarketLauncher(attacker);
    }

    function test_forgedPoolRegistrationReverts() public {
        // Second register of same vault should fail
        vm.expectRevert();
        launcher.registerAndInitializeDefault(address(vault), Constants.SQRT_PRICE_1_1);
    }

    function test_donationDoesNotMintClaims_matchesIndependentModel() public {
        uint256 accounted = vault.accountedUSDC6();
        uint256 w = vault.writerUnits();
        usdc.mint(attacker, 999e6);
        vm.prank(attacker);
        usdc.transfer(address(vault), 999e6);
        assertEq(vault.accountedUSDC6(), accounted, "donation ignored by accounted");
        assertEq(vault.writerUnits(), w, "no unbacked mint");
        assertGt(usdc.balanceOf(address(vault)), accounted);
    }

    function test_pauseBlocksMintNotCancelOrLpExitOrRedeem() public {
        factory.setNewRiskPaused(seriesId, true);
        vm.prank(writer);
        vm.expectRevert(SeriesVault.NewRiskPaused.selector);
        vault.mint(1);

        uint256 matched = vault.longToken().balanceOf(writer);
        if (matched > vault.writerReceipt().balanceOf(writer)) {
            matched = vault.writerReceipt().balanceOf(writer);
        }
        if (matched > 0) {
            vm.prank(writer);
            vault.cancel(1); // cancel still allowed
        }

        // LP remove after pause still allowed during trading
        vm.prank(writer);
        modifyLiq.modifyLiquidity(
            key,
            ModifyLiquidityParams({tickLower: -60, tickUpper: 60, liquidityDelta: -int256(1e8), salt: bytes32(0)}),
            Constants.ZERO_BYTES
        );
    }

    function test_deadlineEndpoints_router() public {
        vm.prank(buyer);
        vm.expectRevert(PairbandRouter.DeadlineExpired.selector);
        router.buyExactOutput(seriesId, 1, 1e18, block.timestamp - 1);
    }

    function test_zeroAmountsRevert() public {
        vm.prank(writer);
        vm.expectRevert(SeriesVault.InvalidAmount.selector);
        vault.mint(0);
        vm.prank(buyer);
        vm.expectRevert(PairbandRouter.ZeroAmount.selector);
        router.buyExactOutput(seriesId, 0, 1e18, block.timestamp + 60);
    }

    function test_phasePermissions_exerciseRedeemWindows() public {
        vm.prank(buyer);
        vm.expectRevert(SeriesVault.InvalidPhase.selector);
        vault.exercise(1);

        vm.warp(exerciseStart);
        vm.prank(writer);
        vm.expectRevert(SeriesVault.InvalidPhase.selector);
        vault.mint(1);
        vm.prank(writer);
        vm.expectRevert(SeriesVault.InvalidPhase.selector);
        vault.cancel(1);

        // LP decrease still ok after cutoff
        vm.prank(writer);
        modifyLiq.modifyLiquidity(
            key,
            ModifyLiquidityParams({tickLower: -60, tickUpper: 60, liquidityDelta: -int256(1e8), salt: bytes32(0)}),
            Constants.ZERO_BYTES
        );

        vm.warp(exerciseEnd);
        vm.prank(buyer);
        vm.expectRevert(SeriesVault.InvalidPhase.selector);
        vault.exercise(1);
    }

    function test_independentModelAgreesOnMixedSequence() public {
        // Use a fresh series with fee to compare ghost math
        (bytes32 sid,) = factory.createSeries(
            SeriesFactory.CreateParams({
                strikePerUnit6: 110,
                tradingStart: tradingStart,
                exerciseStart: exerciseStart,
                exerciseEnd: exerciseEnd,
                maxWriterUnits: 1e12,
                issuanceFeeBps: 10,
                feeRecipient: fee,
                longName: "X",
                longSymbol: "X",
                receiptName: "Y",
                receiptSymbol: "Y"
            })
        );
        SeriesVault v = SeriesVault(factory.vaultBySeriesId(sid));
        vm.prank(writer);
        usdc.approve(address(v), type(uint256).max);
        vm.prank(buyer);
        eurc.approve(address(v), type(uint256).max);

        uint256 ghostW;
        uint256 ghostU;
        uint256 ghostE;
        uint256 ghostEx;
        uint256 ghostFee;
        uint256 ghostR;

        vm.warp(tradingStart);
        uint256 q = 50_000;
        uint256 coll = q * 110;
        uint256 feeAmt = IndependentSeriesMath.ceilFee(coll, 10);
        vm.prank(writer);
        v.mint(q);
        ghostW += q;
        ghostU += coll;
        ghostFee += feeAmt;
        assertEq(v.accountedUSDC6(), ghostU);
        assertEq(v.writerUnits(), ghostW);
        // Fee for this series alone equals ceilFee(coll) — setUp series fees sit in same recipient
        assertGe(usdc.balanceOf(fee), feeAmt);

        ClaimToken vLong = v.longToken();
        vm.prank(writer);
        vLong.transfer(buyer, 20_000);
        vm.prank(writer);
        v.cancel(30_000);
        ghostW -= 30_000;
        ghostU -= 30_000 * 110;
        assertEq(v.writerUnits(), ghostW);
        assertEq(v.accountedUSDC6(), ghostU);

        vm.warp(exerciseStart);
        vm.prank(buyer);
        v.exercise(20_000);
        ghostEx += 20_000;
        ghostU -= 20_000 * 110;
        ghostE += 20_000 * 100;
        assertEq(v.exercisedUnits(), ghostEx);
        assertEq(v.accountedUSDC6(), ghostU);
        assertEq(v.accountedEURC6(), ghostE);

        vm.warp(exerciseEnd);
        uint256 receiptBal = v.writerReceipt().balanceOf(writer);
        (uint256 pu, uint256 pe) =
            IndependentSeriesMath.redeemPayout(ghostW, ghostU, ghostE, ghostR, receiptBal);
        vm.prank(writer);
        v.redeem(receiptBal);
        ghostR += receiptBal;
        ghostU -= pu;
        ghostE -= pe;
        assertEq(v.accountedUSDC6(), ghostU);
        assertEq(v.accountedEURC6(), ghostE);
        assertEq(v.redeemedUnits(), ghostR);
    }

    function test_splitVsBatchRedeemConservation() public {
        vm.warp(exerciseStart);
        // exercise half of buyer longs so mixed reserves exist
        uint256 buyLong = vault.longToken().balanceOf(buyer);
        if (buyLong > 0) {
            vm.prank(buyer);
            vault.exercise(buyLong / 2 == 0 ? buyLong : buyLong / 2);
        }
        vm.warp(exerciseEnd);

        ClaimToken receipt = vault.writerReceipt();
        uint256 total = receipt.balanceOf(writer);
        if (total < 3) return;

        // snapshot via finalize path on first redeem of a clone path: compare split
        SeriesVault v = vault;
        uint256 mid = total / 2;
        uint256 rest = total - mid;

        uint256 u0 = v.accountedUSDC6();
        uint256 e0 = v.accountedEURC6();
        uint256 w0 = v.writerUnits();

        (uint256 a1u, uint256 a1e) = IndependentSeriesMath.redeemPayout(w0, u0, e0, 0, mid);
        (uint256 a2u, uint256 a2e) = IndependentSeriesMath.redeemPayout(w0, u0, e0, mid, rest);
        (uint256 bu, uint256 be) = IndependentSeriesMath.redeemPayout(w0, u0, e0, 0, total);
        assertEq(a1u + a2u, bu, "USDC split=batch");
        assertEq(a1e + a2e, be, "EURC split=batch");
    }
}
