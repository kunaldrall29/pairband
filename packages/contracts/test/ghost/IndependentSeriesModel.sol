// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

/// @notice Independent O02-style series accounting ghost (Solidity twin of SeriesAccountingModel).
/// @dev Must not import SeriesVault formulas; keep parallel arithmetic for invariant comparison.
library IndependentSeriesMath {
    uint256 internal constant UNDERLYING_PER_UNIT_6 = 100;

    function ceilFee(uint256 collateral6, uint16 feeBps) public pure returns (uint256) {
        if (feeBps == 0) return 0;
        return (collateral6 * uint256(feeBps) + 9999) / 10000;
    }

    function redeemPayout(uint256 W0, uint256 U0, uint256 E0, uint256 R, uint256 q)
        public
        pure
        returns (uint256 usdc6, uint256 eurc6)
    {
        if (W0 == 0) return (0, 0);
        usdc6 = ((R + q) * U0) / W0 - (R * U0) / W0;
        eurc6 = ((R + q) * E0) / W0 - (R * E0) / W0;
    }
}

/// @dev Mutable ghost state tracked by the invariant handler.
struct GhostSeries {
    uint256 strikePerUnit6;
    uint256 maxWriterUnits;
    uint16 feeBps;
    uint256 writerUnits;
    uint256 exercisedUnits;
    uint256 redeemedUnits;
    uint256 accountedUsdc6;
    uint256 accountedEurc6;
    uint256 feePaid6;
    bool finalized;
    uint256 snapshotW0;
    uint256 snapshotU0;
    uint256 snapshotE0;
    /// @dev External donations (not accounted) tracked separately for conservation checks.
    uint256 donatedUsdc6;
    uint256 donatedEurc6;
}

library GhostSeriesLib {
    using IndependentSeriesMath for uint256;

    function mint(GhostSeries storage g, uint256 q) internal returns (uint256 collateral6, uint256 fee6) {
        require(q > 0, "q");
        require(g.writerUnits + q <= g.maxWriterUnits, "cap");
        collateral6 = q * g.strikePerUnit6;
        fee6 = IndependentSeriesMath.ceilFee(collateral6, g.feeBps);
        g.writerUnits += q;
        g.accountedUsdc6 += collateral6;
        g.feePaid6 += fee6;
    }

    function cancel(GhostSeries storage g, uint256 q) internal returns (uint256 returnedUsdc6) {
        require(q > 0, "q");
        require(g.exercisedUnits == 0, "after-ex");
        require(q <= g.writerUnits, "insuf");
        returnedUsdc6 = q * g.strikePerUnit6;
        g.writerUnits -= q;
        g.accountedUsdc6 -= returnedUsdc6;
    }

    function exercise(GhostSeries storage g, uint256 q) internal returns (uint256 eurcIn6, uint256 usdcOut6) {
        require(q > 0, "q");
        uint256 longSupply = g.writerUnits - g.exercisedUnits;
        require(q <= longSupply, "insuf");
        eurcIn6 = q * IndependentSeriesMath.UNDERLYING_PER_UNIT_6;
        usdcOut6 = q * g.strikePerUnit6;
        g.exercisedUnits += q;
        g.accountedUsdc6 -= usdcOut6;
        g.accountedEurc6 += eurcIn6;
    }

    function finalize(GhostSeries storage g) internal {
        if (g.finalized) return;
        g.snapshotW0 = g.writerUnits;
        g.snapshotU0 = g.accountedUsdc6;
        g.snapshotE0 = g.accountedEurc6;
        g.finalized = true;
    }

    function redeem(GhostSeries storage g, uint256 q) internal returns (uint256 usdc6, uint256 eurc6) {
        finalize(g);
        require(q > 0, "q");
        require(g.redeemedUnits + q <= g.snapshotW0, "over");
        (usdc6, eurc6) =
            IndependentSeriesMath.redeemPayout(g.snapshotW0, g.snapshotU0, g.snapshotE0, g.redeemedUnits, q);
        g.redeemedUnits += q;
        g.accountedUsdc6 -= usdc6;
        g.accountedEurc6 -= eurc6;
    }

    function noteDonation(GhostSeries storage g, bool isUsdc, uint256 amount6) internal {
        if (isUsdc) g.donatedUsdc6 += amount6;
        else g.donatedEurc6 += amount6;
    }
}
