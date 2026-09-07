// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {PairbandLifecycleHook, ISeriesVaultView} from "./hooks/PairbandLifecycleHook.sol";

/// @notice Designated registrar/initializer for Pairband Uniswap v4 series markets.
/// @dev Not audited. Initialize uses pinned PoolManager; LP seed is expected via verified periphery
///      in a follow-on call during Trading (O08). Any Arc deployment is a Pairband-deployed testnet instance.
contract MarketLauncher is Ownable {
    uint24 public constant DEFAULT_FEE = 3000;
    int24 public constant DEFAULT_TICK_SPACING = 60;

    IPoolManager public immutable poolManager;
    PairbandLifecycleHook public immutable hook;
    address public immutable registry;

    event MarketLaunched(bytes32 indexed seriesId, PoolId indexed poolId, uint160 sqrtPriceX96);

    error ZeroAddress();

    constructor(IPoolManager poolManager_, PairbandLifecycleHook hook_, address registry_, address initialOwner)
        Ownable(initialOwner)
    {
        if (address(poolManager_) == address(0) || address(hook_) == address(0) || registry_ == address(0)) {
            revert ZeroAddress();
        }
        poolManager = poolManager_;
        hook = hook_;
        registry = registry_;
    }

    /// @notice Register immutable market terms then initialize at the frozen sqrt price.
    function registerAndInitialize(address vault, uint24 fee, int24 tickSpacing, uint160 sqrtPriceX96)
        public
        onlyOwner
        returns (PoolId poolId)
    {
        poolId = hook.registerMarket(vault, fee, tickSpacing, sqrtPriceX96, registry);
        PoolKey memory key = hook.getPoolKey(poolId);
        poolManager.initialize(key, sqrtPriceX96);
        emit MarketLaunched(ISeriesVaultView(vault).seriesId(), poolId, sqrtPriceX96);
    }

    function registerAndInitializeDefault(address vault, uint160 sqrtPriceX96)
        external
        onlyOwner
        returns (PoolId poolId)
    {
        return registerAndInitialize(vault, DEFAULT_FEE, DEFAULT_TICK_SPACING, sqrtPriceX96);
    }
}
