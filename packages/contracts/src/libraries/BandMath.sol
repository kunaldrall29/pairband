// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title BandMath
/// @notice Pure helpers for Pairband tick-band alignment, width, and shift.
/// @dev Shift := |ΔtickLower| + |ΔtickUpper| (sum of absolute edge movements).
library BandMath {
    error InvalidTicks();
    error MisalignedTicks();
    error ZeroWidth();

    /// @notice Floor-align `tick` down to a multiple of `tickSpacing`.
    function align(int24 tick, int24 tickSpacing) internal pure returns (int24) {
        if (tickSpacing <= 0) revert InvalidTicks();
        int24 compressed = tick / tickSpacing;
        if (tick < 0 && tick % tickSpacing != 0) compressed--;
        return compressed * tickSpacing;
    }

    /// @notice Ceil-align `tick` up to a multiple of `tickSpacing`.
    function alignUp(int24 tick, int24 tickSpacing) internal pure returns (int24) {
        int24 floored = align(tick, tickSpacing);
        if (floored == tick) return tick;
        return floored + tickSpacing;
    }

    /// @notice Band width in ticks. Reverts if upper <= lower.
    function width(int24 tickLower, int24 tickUpper) internal pure returns (uint24) {
        if (tickUpper <= tickLower) revert ZeroWidth();
        return uint24(uint256(int256(tickUpper) - int256(tickLower)));
    }

    function isValidBand(int24 tickLower, int24 tickUpper, int24 tickSpacing) internal pure returns (bool) {
        if (tickSpacing <= 0) return false;
        if (tickUpper <= tickLower) return false;
        if (tickLower % tickSpacing != 0) return false;
        if (tickUpper % tickSpacing != 0) return false;
        return true;
    }

    function requireValidBand(int24 tickLower, int24 tickUpper, int24 tickSpacing) internal pure {
        if (tickSpacing <= 0) revert InvalidTicks();
        if (tickUpper <= tickLower) revert ZeroWidth();
        if (tickLower % tickSpacing != 0 || tickUpper % tickSpacing != 0) revert MisalignedTicks();
    }

    /// @notice Shift between two bands = |Δlower| + |Δupper|.
    function shift(int24 oldLower, int24 oldUpper, int24 newLower, int24 newUpper)
        internal
        pure
        returns (uint256)
    {
        return _absDiff(oldLower, newLower) + _absDiff(oldUpper, newUpper);
    }

    /// @notice True if `tick` is inside [tickLower, tickUpper).
    function inRange(int24 tick, int24 tickLower, int24 tickUpper) internal pure returns (bool) {
        return tick >= tickLower && tick < tickUpper;
    }

    /// @notice Centered spacing-aligned band around `tick` with width floored to spacing.
    function centeredBand(int24 tick, int24 tickSpacing, uint24 desiredWidth)
        internal
        pure
        returns (int24 tickLower, int24 tickUpper)
    {
        if (tickSpacing <= 0 || desiredWidth == 0) revert InvalidTicks();
        uint24 spacing = uint24(uint256(int256(tickSpacing)));
        uint24 w = desiredWidth - (desiredWidth % spacing);
        if (w == 0) w = spacing;
        int24 half = int24(uint24(w / 2));
        tickLower = align(tick - half, tickSpacing);
        tickUpper = tickLower + int24(uint24(w));
        if (tick < tickLower) {
            unchecked {
                tickLower -= tickSpacing;
                tickUpper -= tickSpacing;
            }
        } else if (tick >= tickUpper) {
            unchecked {
                tickLower += tickSpacing;
                tickUpper += tickSpacing;
            }
        }
    }

    /// @notice Clip proposed band so shift(old→new) ≤ maxShift by scaling edge deltas.
    function clipToMaxShift(int24 oldLower, int24 oldUpper, int24 newLower, int24 newUpper, uint24 maxShift)
        internal
        pure
        returns (int24 clippedLower, int24 clippedUpper)
    {
        if (shift(oldLower, oldUpper, newLower, newUpper) <= maxShift) {
            return (newLower, newUpper);
        }
        return _scaleEdges(oldLower, oldUpper, newLower, newUpper, maxShift);
    }

    function _scaleEdges(int24 oldLower, int24 oldUpper, int24 newLower, int24 newUpper, uint24 maxShift)
        private
        pure
        returns (int24, int24)
    {
        int256 dL = int256(newLower) - int256(oldLower);
        int256 dU = int256(newUpper) - int256(oldUpper);
        int256 absL = dL >= 0 ? dL : -dL;
        int256 absU = dU >= 0 ? dU : -dU;
        int256 total = absL + absU;
        if (total == 0) return (oldLower, oldUpper);

        int256 budget = int256(uint256(maxShift));
        int24 a = int24(int256(oldLower) + (dL * budget) / total);
        int24 b = int24(int256(oldUpper) + (dU * budget) / total);
        if (b <= a) return (oldLower, oldUpper);
        return (a, b);
    }

    function _absDiff(int24 a, int24 b) private pure returns (uint256) {
        int256 d = int256(a) - int256(b);
        return uint256(d >= 0 ? d : -d);
    }
}
