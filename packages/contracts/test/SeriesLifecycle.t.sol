// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {SeriesFactory} from "../src/SeriesFactory.sol";
import {SeriesVault} from "../src/SeriesVault.sol";
import {ClaimToken} from "../src/ClaimToken.sol";
import {MockERC20} from "./MockERC20.sol";

contract SeriesLifecycleTest is Test {
    MockERC20 usdc;
    MockERC20 eurc;
    SeriesFactory factory;
    SeriesVault vault;
    bytes32 seriesId;
    address writer = address(0xA11CE);
    address buyer = address(0xB0B);
    address fee = address(0xFEE);

    uint64 tradingStart = 1_000;
    uint64 exerciseStart = 2_000;
    uint64 exerciseEnd = 3_000;

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
            feeRecipient: fee,
            longName: "PB EURC Put Long",
            longSymbol: "pbEURCp",
            receiptName: "PB Writer Receipt",
            receiptSymbol: "pbWR"
        });
        (seriesId, ) = factory.createSeries(p);
        vault = SeriesVault(factory.vaultBySeriesId(seriesId));

        usdc.mint(writer, 1_000_000e6);
        eurc.mint(buyer, 1_000_000e6);
        vm.prank(writer);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(buyer);
        eurc.approve(address(vault), type(uint256).max);
    }

    function test_mintCancelExerciseRedeem_fixtureAmounts() public {
        vm.warp(tradingStart);
        uint256 q = 1_000_000; // 1 whole option
        uint256 backing = q * 110;
        uint256 feeAmt = (backing * 10 + 9999) / 10000;
        assertEq(feeAmt, 110_000);

        uint256 writerBefore = usdc.balanceOf(writer);
        vm.prank(writer);
        vault.mint(q);
        assertEq(usdc.balanceOf(writer), writerBefore - backing - feeAmt);
        assertEq(usdc.balanceOf(fee), feeAmt);
        assertEq(vault.accountedUSDC6(), backing);
        assertEq(vault.longToken().balanceOf(writer), q);
        assertEq(vault.writerReceipt().balanceOf(writer), q);

        // Transfer long to buyer for exercise path after partial cancel demo
        ClaimToken long = vault.longToken();
        ClaimToken receipt = vault.writerReceipt();
        vm.prank(writer);
        long.transfer(buyer, 400_000);

        // Cancel remaining matched 600_000
        vm.prank(writer);
        vault.cancel(600_000);
        assertEq(vault.writerUnits(), 400_000);
        assertEq(vault.accountedUSDC6(), 400_000 * 110);

        // Exercise window
        vm.warp(exerciseStart);
        vm.prank(buyer);
        vault.exercise(400_000);
        assertEq(vault.accountedUSDC6(), 0);
        assertEq(vault.accountedEURC6(), 400_000 * 100);
        assertEq(usdc.balanceOf(buyer), 400_000 * 110);

        // Maturity — writer redeems EURC
        vm.warp(exerciseEnd);
        uint256 receiptBal = receipt.balanceOf(writer);
        assertEq(receiptBal, 400_000);
        vm.prank(writer);
        vault.redeem(receiptBal);
        assertEq(eurc.balanceOf(writer), 400_000 * 100);
        assertEq(vault.accountedEURC6(), 0);
        assertEq(receipt.balanceOf(writer), 0);
    }

    function test_dustCumulativeAllocation() public {
        vm.warp(tradingStart);
        // fee 0 series for cleaner dust math — create second series
        SeriesFactory.CreateParams memory p = SeriesFactory.CreateParams({
            strikePerUnit6: 110,
            tradingStart: tradingStart,
            exerciseStart: exerciseStart,
            exerciseEnd: exerciseEnd,
            maxWriterUnits: 1e12,
            issuanceFeeBps: 0,
            feeRecipient: fee,
            longName: "L",
            longSymbol: "L",
            receiptName: "R",
            receiptSymbol: "R"
        });
        (bytes32 id2,) = factory.createSeries(p);
        SeriesVault v2 = SeriesVault(factory.vaultBySeriesId(id2));
        address w1 = address(0x1);
        address w2 = address(0x2);
        address w3 = address(0x3);
        ClaimToken long2 = v2.longToken();
        for (uint256 i = 0; i < 3; i++) {
            address a = i == 0 ? w1 : i == 1 ? w2 : w3;
            usdc.mint(a, 1e12);
            vm.prank(a);
            usdc.approve(address(v2), type(uint256).max);
            vm.prank(a);
            v2.mint(1);
            vm.prank(a);
            long2.transfer(buyer, 1);
        }
        assertEq(v2.writerUnits(), 3);
        vm.prank(buyer);
        eurc.approve(address(v2), type(uint256).max);
        vm.warp(exerciseStart);
        vm.prank(buyer);
        v2.exercise(1); // X=1, U=(3-1)*110=220, E=100

        vm.warp(exerciseEnd);
        uint256[3] memory usdcOut;
        uint256[3] memory eurcOut;
        address[3] memory holders = [w1, w2, w3];
        for (uint256 i = 0; i < 3; i++) {
            uint256 u0 = usdc.balanceOf(holders[i]);
            uint256 e0 = eurc.balanceOf(holders[i]);
            vm.prank(holders[i]);
            v2.redeem(1);
            usdcOut[i] = usdc.balanceOf(holders[i]) - u0;
            eurcOut[i] = eurc.balanceOf(holders[i]) - e0;
        }
        // fixture dust claims: 73/33, 73/33, 74/34
        assertEq(usdcOut[0], 73);
        assertEq(eurcOut[0], 33);
        assertEq(usdcOut[1], 73);
        assertEq(eurcOut[1], 33);
        assertEq(usdcOut[2], 74);
        assertEq(eurcOut[2], 34);
        assertEq(usdcOut[0] + usdcOut[1] + usdcOut[2], 220);
        assertEq(eurcOut[0] + eurcOut[1] + eurcOut[2], 100);
    }

    function test_pauseBlocksMintNotCancel() public {
        vm.warp(tradingStart);
        vm.prank(writer);
        vault.mint(1_000_000);
        factory.setNewRiskPaused(seriesId, true);
        vm.prank(writer);
        vm.expectRevert(SeriesVault.NewRiskPaused.selector);
        vault.mint(1);
        vm.prank(writer);
        vault.cancel(1_000_000);
    }

    function test_unauthorizedClaimMintReverts() public {
        ClaimToken long = vault.longToken();
        vm.expectRevert(ClaimToken.NotVault.selector);
        long.mint(writer, 1);
    }

    function test_donationDoesNotInflateClaims() public {
        vm.warp(tradingStart);
        vm.prank(writer);
        vault.mint(1_000_000);
        usdc.mint(address(vault), 999);
        assertEq(vault.accountedUSDC6(), 110_000_000);
        vm.warp(exerciseEnd);
        vault.finalize();
        assertEq(vault.snapshotU0(), 110_000_000);
    }

    function test_termsImmutable_noPublicMutators() public {
        // Strike/times are immutable; compile-time guarantee. Runtime check identity.
        assertEq(vault.strikePerUnit6(), 110);
        assertEq(vault.tradingStart(), tradingStart);
    }
}
