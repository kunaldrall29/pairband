// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";

/// @notice Convert human USDC-per-whole-option prices into ordered pool ticks/sqrt prices.
/// @dev Both tokens are 6 decimals. Option premium ≠ EURC/USDC FX spot. Not audited.
library OptionTickMath {
    uint256 internal constant WHOLE = 1e6;

    error ZeroPrice();
    error InvalidRange();

    /// @param usdcPerWholeRaw6 e.g. 0.12 USDC/option → 120000
    /// @param longIsToken0 true if option token sorts as currency0
    function sqrtPriceX96FromUsdcPerWhole(uint256 usdcPerWholeRaw6, bool longIsToken0)
        internal
        pure
        returns (uint160)
    {
        if (usdcPerWholeRaw6 == 0) revert ZeroPrice();
        // price token1/token0 in raw units
        uint256 amount0;
        uint256 amount1;
        if (longIsToken0) {
            amount0 = WHOLE;
            amount1 = usdcPerWholeRaw6;
        } else {
            amount0 = usdcPerWholeRaw6;
            amount1 = WHOLE;
        }
        return encodeSqrtRatioX96(amount1, amount0);
    }

    function tickFromUsdcPerWhole(uint256 usdcPerWholeRaw6, bool longIsToken0, int24 tickSpacing)
        internal
        pure
        returns (int24)
    {
        uint160 sqrtP = sqrtPriceX96FromUsdcPerWhole(usdcPerWholeRaw6, longIsToken0);
        int24 tick = TickMath.getTickAtSqrtPrice(sqrtP);
        int24 compressed = tick / tickSpacing;
        if (tick < 0 && tick % tickSpacing != 0) compressed--;
        return compressed * tickSpacing;
    }

    function assertOrderedRange(int24 tickLower, int24 tickUpper) internal pure {
        if (!(tickLower < tickUpper)) revert InvalidRange();
    }

    /// @dev sqrt(amount1/amount0) * 2^96
    function encodeSqrtRatioX96(uint256 amount1, uint256 amount0) internal pure returns (uint160) {
        require(amount0 > 0 && amount1 > 0, "ratio");
        uint256 ratioX192 = (amount1 << 192) / amount0;
        return uint160(sqrt(ratioX192));
    }

    function sqrt(uint256 x) internal pure returns (uint256 z) {
        if (x == 0) return 0;
        uint256 y = x;
        z = (y + 1) / 2;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
