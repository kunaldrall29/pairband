// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {TransientStateLibrary} from "@uniswap/v4-core/src/libraries/TransientStateLibrary.sol";

import {PairbandLifecycleHook, ISeriesVaultView} from "./hooks/PairbandLifecycleHook.sol";

/// @notice Simulation quoter for PairbandRouter. Call via eth_call / staticcall.
/// @dev Reverts with QuoteResult. Does not settle — not for broadcast.
///      Not audited. Not a price guarantee. Not official Uniswap Quoter on Arc.
contract PairbandQuoter is IUnlockCallback {
    using PoolIdLibrary for PoolKey;
    using TransientStateLibrary for IPoolManager;

    IPoolManager public immutable poolManager;
    PairbandLifecycleHook public immutable hook;

    struct QuoteCtx {
        bytes32 seriesId;
        address longToken;
        address usdc;
        bool isBuy;
        uint256 optionUnits;
        bool active;
    }

    QuoteCtx private _q;

    error QuoteResult(uint256 usdc6, uint256 optionUnits6, bool isBuy, bytes32 poolId, uint256 blockNumber);
    error NotPoolManager();
    error UnknownMarket();
    error TradingDisabled();
    error ZeroAmount();
    error NoActiveQuote();

    constructor(IPoolManager poolManager_, PairbandLifecycleHook hook_) {
        poolManager = poolManager_;
        hook = hook_;
    }

    function quoteBuy(bytes32 seriesId, uint256 optionUnits) external {
        _quote(seriesId, optionUnits, true);
    }

    function quoteSell(bytes32 seriesId, uint256 optionUnits) external {
        _quote(seriesId, optionUnits, false);
    }

    function _quote(bytes32 seriesId, uint256 optionUnits, bool isBuy) internal {
        if (optionUnits == 0) revert ZeroAmount();
        PoolId poolId = hook.poolIdBySeries(seriesId);
        if (PoolId.unwrap(poolId) == bytes32(0)) revert UnknownMarket();
        (bytes32 sid, address vault,,,,,, bool registered, bool initialized) = hook.markets(poolId);
        if (!registered || !initialized || sid != seriesId) revert UnknownMarket();
        ISeriesVaultView v = ISeriesVaultView(vault);
        if (v.phase() != 1 || v.newRiskPaused()) revert TradingDisabled();

        PoolKey memory key = hook.getPoolKey(poolId);
        _q = QuoteCtx({
            seriesId: seriesId,
            longToken: v.longToken(),
            usdc: v.settlement(),
            isBuy: isBuy,
            optionUnits: optionUnits,
            active: true
        });
        poolManager.unlock(abi.encode(key));
    }

    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        QuoteCtx memory q = _q;
        if (!q.active) revert NoActiveQuote();
        delete _q;

        PoolKey memory key = abi.decode(data, (PoolKey));
        bool longIs0 = Currency.unwrap(key.currency0) == q.longToken;
        bool zeroForOne;
        int256 amountSpecified;
        if (q.isBuy) {
            zeroForOne = !longIs0;
            amountSpecified = int256(q.optionUnits);
        } else {
            zeroForOne = longIs0;
            amountSpecified = -int256(q.optionUnits);
        }
        uint160 limit = zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1;
        poolManager.swap(
            key,
            IPoolManager.SwapParams({zeroForOne: zeroForOne, amountSpecified: amountSpecified, sqrtPriceLimitX96: limit}),
            ""
        );

        int256 deltaLong = poolManager.currencyDelta(address(this), Currency.wrap(q.longToken));
        int256 deltaUsdc = poolManager.currencyDelta(address(this), Currency.wrap(q.usdc));

        uint256 usdc6;
        if (q.isBuy) {
            require(deltaLong == int256(q.optionUnits), "partial");
            require(deltaUsdc < 0, "usdc");
            usdc6 = uint256(-deltaUsdc);
        } else {
            require(deltaLong == -int256(q.optionUnits), "partial");
            require(deltaUsdc > 0, "usdc");
            usdc6 = uint256(deltaUsdc);
        }

        revert QuoteResult(usdc6, q.optionUnits, q.isBuy, PoolId.unwrap(key.toId()), block.number);
    }
}
