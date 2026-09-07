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
import {CurrencyPay} from "./libraries/CurrencyPay.sol";

/// @notice Narrow single-pool router for registered long-option / ERC-20 USDC markets.
/// @dev Not audited. Pairband-deployed PoolManager fixtures only — not official Uniswap on Arc.
///      Buy = exact-output options with max USDC. Sell = exact-input options with min USDC.
///      Partial fills revert. Payer/recipient are always msg.sender. Rejects msg.value.
contract PairbandRouter is IUnlockCallback {
    using PoolIdLibrary for PoolKey;
    using TransientStateLibrary for IPoolManager;
    using CurrencyPay for Currency;

    IPoolManager public immutable poolManager;
    PairbandLifecycleHook public immutable hook;

    struct TradeContext {
        address account;
        bytes32 seriesId;
        address longToken;
        address usdc;
        bool isBuy;
        uint256 optionUnits;
        uint256 usdcBound;
        bool active;
    }

    TradeContext private _ctx;

    event Bought(
        bytes32 indexed seriesId, address indexed account, uint256 optionUnits, uint256 usdcPaid6, PoolId poolId
    );
    event Sold(
        bytes32 indexed seriesId, address indexed account, uint256 optionUnits, uint256 usdcReceived6, PoolId poolId
    );

    error NativeValueNotAllowed();
    error DeadlineExpired();
    error ZeroAmount();
    error AmountOverflow();
    error UnknownMarket();
    error TradingDisabled();
    error NotPoolManager();
    error NoActiveContext();
    error ContextBusy();
    error PartialFill();
    error SlippageExceeded();
    error ResidualBalance();

    constructor(IPoolManager poolManager_, PairbandLifecycleHook hook_) {
        require(address(poolManager_) != address(0) && address(hook_) != address(0), "zero");
        poolManager = poolManager_;
        hook = hook_;
    }

    function buyExactOutput(bytes32 seriesId, uint256 optionUnits, uint256 maxUSDC6, uint256 deadline)
        external
        payable
        returns (uint256 usdcPaid6)
    {
        if (msg.value != 0) revert NativeValueNotAllowed();
        if (block.timestamp > deadline) revert DeadlineExpired();
        if (optionUnits == 0 || maxUSDC6 == 0) revert ZeroAmount();
        if (optionUnits > uint256(type(int256).max) || maxUSDC6 > uint256(type(int256).max)) revert AmountOverflow();

        (PoolKey memory key, address vault) = _loadMarket(seriesId);
        _assertTrading(vault);

        address longToken = ISeriesVaultView(vault).longToken();
        address usdc = ISeriesVaultView(vault).settlement();

        _openContext(
            TradeContext({
                account: msg.sender,
                seriesId: seriesId,
                longToken: longToken,
                usdc: usdc,
                isBuy: true,
                optionUnits: optionUnits,
                usdcBound: maxUSDC6,
                active: true
            })
        );

        bytes memory result = poolManager.unlock(abi.encode(key));
        usdcPaid6 = abi.decode(result, (uint256));
        _clearContext();

        emit Bought(seriesId, msg.sender, optionUnits, usdcPaid6, key.toId());
    }

    function sellExactInput(bytes32 seriesId, uint256 optionUnits, uint256 minUSDC6, uint256 deadline)
        external
        payable
        returns (uint256 usdcReceived6)
    {
        if (msg.value != 0) revert NativeValueNotAllowed();
        if (block.timestamp > deadline) revert DeadlineExpired();
        if (optionUnits == 0) revert ZeroAmount();
        if (optionUnits > uint256(type(int256).max) || minUSDC6 > uint256(type(int256).max)) revert AmountOverflow();

        (PoolKey memory key, address vault) = _loadMarket(seriesId);
        _assertTrading(vault);

        address longToken = ISeriesVaultView(vault).longToken();
        address usdc = ISeriesVaultView(vault).settlement();

        _openContext(
            TradeContext({
                account: msg.sender,
                seriesId: seriesId,
                longToken: longToken,
                usdc: usdc,
                isBuy: false,
                optionUnits: optionUnits,
                usdcBound: minUSDC6,
                active: true
            })
        );

        bytes memory result = poolManager.unlock(abi.encode(key));
        usdcReceived6 = abi.decode(result, (uint256));
        _clearContext();

        emit Sold(seriesId, msg.sender, optionUnits, usdcReceived6, key.toId());
    }

    /// @dev Authorization is stored `_ctx` (entry msg.sender), not calldata payer fields.
    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        TradeContext memory ctx = _ctx;
        if (!ctx.active) revert NoActiveContext();

        PoolKey memory key = abi.decode(data, (PoolKey));
        PoolId poolId = key.toId();
        (bytes32 seriesId,,,,,,, bool registered, bool initialized) = hook.markets(poolId);
        if (!registered || !initialized || seriesId != ctx.seriesId) revert UnknownMarket();

        bool longIs0 = Currency.unwrap(key.currency0) == ctx.longToken;
        bool zeroForOne;
        int256 amountSpecified;
        if (ctx.isBuy) {
            zeroForOne = !longIs0;
            amountSpecified = int256(ctx.optionUnits);
        } else {
            zeroForOne = longIs0;
            amountSpecified = -int256(ctx.optionUnits);
        }

        uint160 limit = zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1;
        poolManager.swap(
            key,
            IPoolManager.SwapParams({zeroForOne: zeroForOne, amountSpecified: amountSpecified, sqrtPriceLimitX96: limit}),
            ""
        );

        int256 deltaLong = poolManager.currencyDelta(address(this), Currency.wrap(ctx.longToken));
        int256 deltaUsdc = poolManager.currencyDelta(address(this), Currency.wrap(ctx.usdc));

        uint256 usdcMoved;
        if (ctx.isBuy) {
            if (deltaLong != int256(ctx.optionUnits)) revert PartialFill();
            if (deltaUsdc >= 0) revert PartialFill();
            usdcMoved = uint256(-deltaUsdc);
            if (usdcMoved > ctx.usdcBound) revert SlippageExceeded();

            Currency.wrap(ctx.usdc).settle(poolManager, ctx.account, usdcMoved);
            Currency.wrap(ctx.longToken).take(poolManager, ctx.account, ctx.optionUnits);
        } else {
            if (deltaLong != -int256(ctx.optionUnits)) revert PartialFill();
            if (deltaUsdc <= 0) revert PartialFill();
            usdcMoved = uint256(deltaUsdc);
            if (usdcMoved < ctx.usdcBound) revert SlippageExceeded();

            Currency.wrap(ctx.longToken).settle(poolManager, ctx.account, ctx.optionUnits);
            Currency.wrap(ctx.usdc).take(poolManager, ctx.account, usdcMoved);
        }

        if (poolManager.currencyDelta(address(this), Currency.wrap(ctx.longToken)) != 0) revert ResidualBalance();
        if (poolManager.currencyDelta(address(this), Currency.wrap(ctx.usdc)) != 0) revert ResidualBalance();

        return abi.encode(usdcMoved);
    }

    function _loadMarket(bytes32 seriesId) internal view returns (PoolKey memory key, address vault) {
        PoolId poolId = hook.poolIdBySeries(seriesId);
        if (PoolId.unwrap(poolId) == bytes32(0)) revert UnknownMarket();
        (bytes32 sid, address v,,,,,, bool registered, bool initialized) = hook.markets(poolId);
        if (!registered || !initialized || sid != seriesId) revert UnknownMarket();
        vault = v;
        key = hook.getPoolKey(poolId);
    }

    function _assertTrading(address vault) internal view {
        ISeriesVaultView v = ISeriesVaultView(vault);
        if (v.phase() != 1 || v.newRiskPaused()) revert TradingDisabled();
    }

    function _openContext(TradeContext memory ctx) internal {
        if (_ctx.active) revert ContextBusy();
        _ctx = ctx;
    }

    function _clearContext() internal {
        delete _ctx;
    }
}
