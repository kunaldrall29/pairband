// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {BandMath} from "../src/libraries/BandMath.sol";

/// @dev Library calls are inlined; route reverts through an external contract for expectRevert.
contract BandMathHarness {
    function width(int24 tickLower, int24 tickUpper) external pure returns (uint24) {
        return BandMath.width(tickLower, tickUpper);
    }

    function requireValidBand(int24 tickLower, int24 tickUpper, int24 tickSpacing) external pure {
        BandMath.requireValidBand(tickLower, tickUpper, tickSpacing);
    }

    function centeredBand(int24 tick, int24 tickSpacing, uint24 desiredWidth)
        external
        pure
        returns (int24, int24)
    {
        return BandMath.centeredBand(tick, tickSpacing, desiredWidth);
    }
}

contract BandMathTest is Test {
    int24 constant SPACING_10 = 10;
    int24 constant SPACING_60 = 60;

    BandMathHarness internal harness;

    function setUp() public {
        harness = new BandMathHarness();
    }

    function test_align_positive() public pure {
        assertEq(BandMath.align(int24(15), SPACING_10), int24(10));
        assertEq(BandMath.align(int24(20), SPACING_10), int24(20));
        assertEq(BandMath.align(int24(0), SPACING_10), int24(0));
    }

    function test_align_negative() public pure {
        // -15 / 10 in Solidity = -1 (toward zero); non-multiple → compressed-- → -2 → -20
        assertEq(BandMath.align(int24(-15), SPACING_10), int24(-20));
        assertEq(BandMath.align(int24(-20), SPACING_10), int24(-20));
        assertEq(BandMath.align(int24(-1), SPACING_10), int24(-10));
    }

    function test_alignUp() public pure {
        assertEq(BandMath.alignUp(int24(15), SPACING_10), int24(20));
        assertEq(BandMath.alignUp(int24(20), SPACING_10), int24(20));
        assertEq(BandMath.alignUp(int24(-15), SPACING_10), int24(-10));
    }

    function test_width() public pure {
        assertEq(BandMath.width(int24(-60), int24(60)), uint24(120));
        assertEq(BandMath.width(int24(0), int24(60)), uint24(60));
    }

    function test_width_revertsWhenInverted() public {
        vm.expectRevert(BandMath.ZeroWidth.selector);
        harness.width(int24(60), int24(-60));
    }

    function test_isValidBand() public pure {
        assertTrue(BandMath.isValidBand(int24(-60), int24(60), SPACING_60));
        assertFalse(BandMath.isValidBand(int24(-61), int24(60), SPACING_60));
        assertFalse(BandMath.isValidBand(int24(60), int24(-60), SPACING_60));
        assertFalse(BandMath.isValidBand(int24(0), int24(0), SPACING_10));
    }

    function test_requireValidBand_revertsMisaligned() public {
        vm.expectRevert(BandMath.MisalignedTicks.selector);
        harness.requireValidBand(int24(-1), int24(60), SPACING_60);
    }

    function test_requireValidBand_revertsZeroWidth() public {
        vm.expectRevert(BandMath.ZeroWidth.selector);
        harness.requireValidBand(int24(0), int24(0), SPACING_10);
    }

    function test_shift_definition() public pure {
        // |ΔL| + |ΔU| = |10| + |10| = 20
        assertEq(BandMath.shift(int24(-60), int24(60), int24(-50), int24(70)), uint256(20));
        // move only lower
        assertEq(BandMath.shift(int24(-60), int24(60), int24(-120), int24(60)), uint256(60));
        // identical
        assertEq(BandMath.shift(int24(0), int24(100), int24(0), int24(100)), uint256(0));
    }

    function test_inRange() public pure {
        assertTrue(BandMath.inRange(int24(0), int24(-60), int24(60)));
        assertTrue(BandMath.inRange(int24(-60), int24(-60), int24(60)));
        assertFalse(BandMath.inRange(int24(60), int24(-60), int24(60))); // upper exclusive
        assertFalse(BandMath.inRange(int24(100), int24(-60), int24(60)));
    }

    function test_centeredBand_alignedAndContainsTick() public pure {
        (int24 lo, int24 hi) = BandMath.centeredBand(int24(37), SPACING_10, uint24(100));
        assertEq(hi - lo, int24(100));
        assertEq(lo % SPACING_10, int24(0));
        assertEq(hi % SPACING_10, int24(0));
        assertTrue(BandMath.inRange(int24(37), lo, hi));
    }

    function test_centeredBand_negativeTick() public pure {
        (int24 lo, int24 hi) = BandMath.centeredBand(int24(-37), SPACING_10, uint24(60));
        assertTrue(BandMath.isValidBand(lo, hi, SPACING_10));
        assertTrue(BandMath.inRange(int24(-37), lo, hi));
    }

    function test_centeredBand_revertsInvalidSpacing() public {
        vm.expectRevert(BandMath.InvalidTicks.selector);
        harness.centeredBand(int24(0), int24(0), uint24(100));
    }

    function test_clipToMaxShift_noOpWhenWithin() public pure {
        (int24 a, int24 b) =
            BandMath.clipToMaxShift(int24(-60), int24(60), int24(-50), int24(70), uint24(100));
        assertEq(a, int24(-50));
        assertEq(b, int24(70));
    }

    function test_clipToMaxShift_reducesOvershoot() public pure {
        // old [-60,60], new [-600,600], shift huge; maxShift 120
        (int24 a, int24 b) =
            BandMath.clipToMaxShift(int24(-60), int24(60), int24(-600), int24(600), uint24(120));
        assertLe(BandMath.shift(int24(-60), int24(60), a, b), uint256(120));
        assertTrue(b > a);
    }

    function test_clipToMaxShift_zeroMaxKeepsCurrent() public pure {
        (int24 a, int24 b) =
            BandMath.clipToMaxShift(int24(-60), int24(60), int24(-120), int24(0), uint24(0));
        assertEq(a, int24(-60));
        assertEq(b, int24(60));
    }

    function testFuzz_alignIdempotent(int24 tick) public pure {
        tick = int24(bound(int256(tick), -887272, 887272));
        int24 a = BandMath.align(tick, SPACING_60);
        assertEq(a, BandMath.align(a, SPACING_60));
        assertEq(a % SPACING_60, int24(0));
        assertLe(a, tick);
    }

    function testFuzz_shiftSymmetric(int24 oL, int24 oU, int24 nL, int24 nU) public pure {
        oL = int24(bound(int256(oL), -100000, 100000));
        oU = int24(bound(int256(oU), int256(oL) + 1, 100001));
        nL = int24(bound(int256(nL), -100000, 100000));
        nU = int24(bound(int256(nU), int256(nL) + 1, 100001));
        assertEq(BandMath.shift(oL, oU, nL, nU), BandMath.shift(nL, nU, oL, oU));
    }
}
