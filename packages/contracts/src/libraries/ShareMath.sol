// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ShareMath
/// @notice Share mint/burn helpers with explicit rounding.
/// @dev `mulDivDown` floors; `mulDivUp` ceil-rounds. Deposit mints use floor (favor vault).
///      Withdraw burns use floor on assets returned (favor vault). First-deposit dead shares
///      are burned to `0xdead` separately by the vault.
library ShareMath {
    error DivByZero();

    /// @notice Floor(a * b / denominator).
    function mulDivDown(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256) {
        if (denominator == 0) revert DivByZero();
        return (a * b) / denominator;
    }

    /// @notice Ceil(a * b / denominator).
    function mulDivUp(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256) {
        if (denominator == 0) revert DivByZero();
        uint256 product = a * b;
        return (product + denominator - 1) / denominator;
    }

    /// @notice Shares minted for `liquidity` deposited given prior totals. Floors.
    function sharesForLiquidity(uint256 liquidity, uint256 totalSupply, uint256 totalLiquidity)
        internal
        pure
        returns (uint256)
    {
        if (totalSupply == 0 || totalLiquidity == 0) return liquidity;
        return mulDivDown(liquidity, totalSupply, totalLiquidity);
    }

    /// @notice Liquidity to remove for `shares` burned. Floors.
    function liquidityForShares(uint256 shares, uint256 totalSupply, uint256 totalLiquidity)
        internal
        pure
        returns (uint256)
    {
        if (totalSupply == 0) revert DivByZero();
        return mulDivDown(shares, totalLiquidity, totalSupply);
    }
}
