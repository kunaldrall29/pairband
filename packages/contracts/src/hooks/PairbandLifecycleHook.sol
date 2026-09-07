// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";

interface ISeriesVaultView {
    function seriesId() external view returns (bytes32);
    function settlement() external view returns (address);
    function longToken() external view returns (address);
    function writerReceipt() external view returns (address);
    function phase() external view returns (uint8);
    function newRiskPaused() external view returns (bool);
    function accountedUSDC6() external view returns (uint256);
}

interface ISeriesRegistryView {
    function isSeriesVault(address vault) external view returns (bool);
}

/// @notice Uniswap v4 lifecycle gate for registered long-option / ERC-20 USDC pools.
/// @dev Not audited. No collateral movement. No beforeRemoveLiquidity restriction. No return deltas.
///      Official Uniswap is not listed on Arc; any Arc deploy must be labeled Pairband-deployed testnet instance.
contract PairbandLifecycleHook is IHooks {
    using PoolIdLibrary for PoolKey;
    using Hooks for IHooks;

    /// @dev Permission mask: beforeInitialize | beforeAddLiquidity | beforeSwap
    ///      Hardcoded bit positions match Hooks.sol flags (1<<13 | 1<<11 | 1<<7).
    uint160 public constant PERMISSION_FLAGS = uint160((1 << 13) | (1 << 11) | (1 << 7));

    IPoolManager public immutable poolManager;
    address public marketLauncher;
    bool public launcherLocked;

    struct Market {
        bytes32 seriesId;
        address vault;
        Currency currency0;
        Currency currency1;
        uint24 fee;
        int24 tickSpacing;
        uint160 sqrtPriceX96;
        bool registered;
        bool initialized;
    }

    mapping(PoolId => Market) public markets;
    mapping(bytes32 => PoolId) public poolIdBySeries;

    event MarketLauncherSet(address indexed launcher);
    event MarketRegistered(
        bytes32 indexed seriesId,
        PoolId indexed poolId,
        address vault,
        Currency currency0,
        Currency currency1,
        uint24 fee,
        int24 tickSpacing,
        uint160 sqrtPriceX96
    );
    event MarketInitialized(bytes32 indexed seriesId, PoolId indexed poolId, uint160 sqrtPriceX96);

    error NotPoolManager();
    error HookNotConfigured();
    error InvalidLauncher();
    error LauncherAlreadySet();
    error OnlyLauncher();
    error UnknownVault();
    error UnsupportedPair();
    error WriterReceiptForbidden();
    error NativeCurrencyForbidden();
    error DuplicateSeriesPool();
    error UnknownMarket();
    error AlreadyInitialized();
    error UnauthorizedInitialize();
    error PriceMismatch();
    error KeyMismatch();
    error TradingDisabled();
    error NotImplemented();

    modifier onlyPoolManager() {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        _;
    }

    modifier onlyLauncher() {
        if (msg.sender != marketLauncher) revert OnlyLauncher();
        _;
    }

    constructor(IPoolManager poolManager_) {
        poolManager = poolManager_;
        IHooks(this).validateHookPermissions(
            Hooks.Permissions({
                beforeInitialize: true,
                afterInitialize: false,
                beforeAddLiquidity: true,
                afterAddLiquidity: false,
                beforeRemoveLiquidity: false,
                afterRemoveLiquidity: false,
                beforeSwap: true,
                afterSwap: false,
                beforeDonate: false,
                afterDonate: false,
                beforeSwapReturnDelta: false,
                afterSwapReturnDelta: false,
                afterAddLiquidityReturnDelta: false,
                afterRemoveLiquidityReturnDelta: false
            })
        );
    }

    /// @notice One-shot designation of the market launcher (CREATE2 deploy order helper).
    function setMarketLauncher(address launcher) external {
        if (launcherLocked) revert LauncherAlreadySet();
        if (launcher == address(0)) revert InvalidLauncher();
        marketLauncher = launcher;
        launcherLocked = true;
        emit MarketLauncherSet(launcher);
    }

    /// @notice Register immutable pool parameters for a curated series vault. Does not initialize.
    function registerMarket(
        address vault,
        uint24 fee,
        int24 tickSpacing,
        uint160 sqrtPriceX96,
        address registry
    ) external onlyLauncher returns (PoolId poolId) {
        if (vault == address(0) || registry == address(0)) revert UnknownVault();
        if (!ISeriesRegistryView(registry).isSeriesVault(vault)) revert UnknownVault();
        if (fee == 0 || tickSpacing <= 0 || sqrtPriceX96 == 0) revert UnsupportedPair();

        ISeriesVaultView v = ISeriesVaultView(vault);
        bytes32 seriesId = v.seriesId();
        if (PoolId.unwrap(poolIdBySeries[seriesId]) != bytes32(0)) revert DuplicateSeriesPool();

        address longToken = v.longToken();
        address settlement = v.settlement();
        address receipt = v.writerReceipt();
        if (longToken == address(0) || settlement == address(0)) revert UnsupportedPair();
        if (longToken == settlement) revert UnsupportedPair();
        if (longToken == receipt || settlement == receipt) revert WriterReceiptForbidden();
        if (longToken == address(0) || settlement == Currency.unwrap(CurrencyLibrary.ADDRESS_ZERO)) {
            revert NativeCurrencyForbidden();
        }

        Currency currencyA = Currency.wrap(longToken);
        Currency currencyB = Currency.wrap(settlement);
        Currency currency0 = currencyA < currencyB ? currencyA : currencyB;
        Currency currency1 = currencyA < currencyB ? currencyB : currencyA;

        PoolKey memory key = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: fee,
            tickSpacing: tickSpacing,
            hooks: IHooks(address(this))
        });
        poolId = key.toId();

        markets[poolId] = Market({
            seriesId: seriesId,
            vault: vault,
            currency0: currency0,
            currency1: currency1,
            fee: fee,
            tickSpacing: tickSpacing,
            sqrtPriceX96: sqrtPriceX96,
            registered: true,
            initialized: false
        });
        poolIdBySeries[seriesId] = poolId;

        emit MarketRegistered(seriesId, poolId, vault, currency0, currency1, fee, tickSpacing, sqrtPriceX96);
    }

    function getPoolKey(PoolId poolId) external view returns (PoolKey memory key) {
        Market memory m = markets[poolId];
        if (!m.registered) revert UnknownMarket();
        key = PoolKey({
            currency0: m.currency0,
            currency1: m.currency1,
            fee: m.fee,
            tickSpacing: m.tickSpacing,
            hooks: IHooks(address(this))
        });
    }

    // ───────────────────────── IHooks (permissioned) ─────────────────────────

    function beforeInitialize(address sender, PoolKey calldata key, uint160 sqrtPriceX96)
        external
        override
        onlyPoolManager
        returns (bytes4)
    {
        PoolId poolId = key.toId();
        Market storage m = markets[poolId];
        if (!m.registered) revert UnknownMarket();
        if (m.initialized) revert AlreadyInitialized();
        if (sender != marketLauncher) revert UnauthorizedInitialize();
        if (sqrtPriceX96 != m.sqrtPriceX96) revert PriceMismatch();
        if (
            Currency.unwrap(key.currency0) != Currency.unwrap(m.currency0)
                || Currency.unwrap(key.currency1) != Currency.unwrap(m.currency1) || key.fee != m.fee
                || key.tickSpacing != m.tickSpacing || address(key.hooks) != address(this)
        ) revert KeyMismatch();

        m.initialized = true;
        emit MarketInitialized(m.seriesId, poolId, sqrtPriceX96);
        return IHooks.beforeInitialize.selector;
    }

    function beforeSwap(address, PoolKey calldata key, IPoolManager.SwapParams calldata, bytes calldata)
        external
        view
        override
        onlyPoolManager
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        _requireTrading(key);
        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    function beforeAddLiquidity(address, PoolKey calldata key, IPoolManager.ModifyLiquidityParams calldata, bytes calldata)
        external
        view
        override
        onlyPoolManager
        returns (bytes4)
    {
        _requireTrading(key);
        return IHooks.beforeAddLiquidity.selector;
    }

    // ───────────────────── unused callbacks (must not be flagged) ─────────────────────

    function afterInitialize(address, PoolKey calldata, uint160, int24) external pure override returns (bytes4) {
        revert NotImplemented();
    }

    function afterAddLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, BalanceDelta) {
        revert NotImplemented();
    }

    function beforeRemoveLiquidity(address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        revert NotImplemented();
    }

    function afterRemoveLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, BalanceDelta) {
        revert NotImplemented();
    }

    function afterSwap(address, PoolKey calldata, IPoolManager.SwapParams calldata, BalanceDelta, bytes calldata)
        external
        pure
        override
        returns (bytes4, int128)
    {
        revert NotImplemented();
    }

    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        revert NotImplemented();
    }

    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        revert NotImplemented();
    }

    function _requireTrading(PoolKey calldata key) internal view {
        Market memory m = markets[key.toId()];
        if (!m.registered || !m.initialized) revert UnknownMarket();
        ISeriesVaultView v = ISeriesVaultView(m.vault);
        if (v.phase() != 1) revert TradingDisabled();
        if (v.newRiskPaused()) revert TradingDisabled();
    }
}
