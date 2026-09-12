// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "@openzeppelin/uniswap-hooks/src/base/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";

/// @title PairbandHook
/// @notice Singleton Uniswap v4 hook: vault-gated liquidity + afterSwap telemetry.
/// @dev Address flags ONLY:
///      BEFORE_INITIALIZE | BEFORE_ADD_LIQUIDITY | BEFORE_REMOVE_LIQUIDITY | AFTER_SWAP
///      afterSwap emits only — no storage writes that can grief swaps.
contract PairbandHook is BaseHook {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    /// @dev Transient slot base for per-tx liquidity authorization (vault → PositionManager).
    bytes32 private constant _AUTH_SLOT = keccak256("pairband.hook.auth");

    error NotVault();
    error NotFactory();
    error VaultAlreadySet();
    error VaultNotRegistered();
    error ZeroAddress();

    /// @notice Factory allowed to register vaults.
    address public immutable factory;

    /// @notice PositionManager; when non-zero, vault may authorize it as locker for one tx.
    address public immutable positionManager;

    /// @notice poolId => PairbandVault that owns liquidity for that pool.
    mapping(PoolId => address) public vaultOf;

    /// @notice Emitted on every swap; UI indexes tick path. No storage.
    event SwapTouched(PoolId indexed poolId, int24 tick, uint160 sqrtPriceX96);

    /// @notice Vault registered for a pool (before initialize).
    event VaultRegistered(PoolId indexed poolId, address indexed vault);

    constructor(IPoolManager _poolManager, address _factory, address _positionManager) BaseHook(_poolManager) {
        if (_factory == address(0)) revert ZeroAddress();
        factory = _factory;
        positionManager = _positionManager;
    }

    /// @inheritdoc BaseHook
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: true,
            afterInitialize: false,
            beforeAddLiquidity: true,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: true,
            afterRemoveLiquidity: false,
            beforeSwap: false,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    /// @notice Required address flags for CREATE2 mining (must match getHookPermissions).
    function requiredFlags() public pure returns (uint160) {
        return uint160(
            Hooks.BEFORE_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_REMOVE_LIQUIDITY_FLAG
                | Hooks.AFTER_SWAP_FLAG
        );
    }

    /// @notice Register the sole vault for `key` before pool initialize. Factory only.
    function registerVault(PoolKey calldata key, address vault) external {
        if (msg.sender != factory) revert NotFactory();
        if (vault == address(0)) revert ZeroAddress();
        if (address(key.hooks) != address(this)) revert VaultNotRegistered();
        PoolId id = key.toId();
        if (vaultOf[id] != address(0)) revert VaultAlreadySet();
        vaultOf[id] = vault;
        emit VaultRegistered(id, vault);
    }

    /// @notice Vault authorizes PositionManager (or itself) as liquidity locker for this transaction.
    /// @dev Uses transient storage so authorization cannot leak across txs.
    function authorizeLiquidityOp(PoolId poolId) external {
        address vault = vaultOf[poolId];
        if (msg.sender != vault) revert NotVault();
        bytes32 slot = keccak256(abi.encode(poolId, _AUTH_SLOT));
        assembly {
            tstore(slot, vault)
        }
    }

    function _authorizedVault(PoolId poolId) internal view returns (address vault) {
        bytes32 slot = keccak256(abi.encode(poolId, _AUTH_SLOT));
        assembly {
            vault := tload(slot)
        }
    }

    function _requireVaultLocker(PoolKey calldata key, address sender) internal view {
        PoolId id = key.toId();
        address vault = vaultOf[id];
        if (vault == address(0)) revert VaultNotRegistered();
        if (sender == vault) return;
        // PositionManager path: vault must have called authorizeLiquidityOp in this tx.
        if (positionManager != address(0) && sender == positionManager && _authorizedVault(id) == vault) {
            return;
        }
        revert NotVault();
    }

    /// @dev Confirms vault was registered; does not overwrite.
    function _beforeInitialize(address, PoolKey calldata key, uint160) internal view override returns (bytes4) {
        PoolId id = key.toId();
        if (vaultOf[id] == address(0)) revert VaultNotRegistered();
        return this.beforeInitialize.selector;
    }

    function _beforeAddLiquidity(address sender, PoolKey calldata key, ModifyLiquidityParams calldata, bytes calldata)
        internal
        view
        override
        returns (bytes4)
    {
        _requireVaultLocker(key, sender);
        return this.beforeAddLiquidity.selector;
    }

    function _beforeRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) internal view override returns (bytes4) {
        _requireVaultLocker(key, sender);
        return this.beforeRemoveLiquidity.selector;
    }

    /// @dev Emit-only. No storage.
    function _afterSwap(address, PoolKey calldata key, SwapParams calldata, BalanceDelta, bytes calldata)
        internal
        override
        returns (bytes4, int128)
    {
        PoolId id = key.toId();
        (uint160 sqrtPriceX96, int24 tick,,) = poolManager.getSlot0(id);
        emit SwapTouched(id, tick, sqrtPriceX96);
        return (this.afterSwap.selector, 0);
    }
}
