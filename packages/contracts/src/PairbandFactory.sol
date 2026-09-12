// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";

import {PairbandHook} from "./PairbandHook.sol";
import {PairbandVault} from "./PairbandVault.sol";

/// @title PairbandFactory
/// @notice Deploys a PairbandVault per pool, registers it on the singleton hook, and initializes the pool.
contract PairbandFactory is Ownable {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    uint16 public constant PROTOCOL_FEE_CAP_BPS = 200;

    error FeeCap();
    error ZeroAddress();
    error HookMismatch();
    error InvalidBand();
    error VaultExists();

    IPoolManager public immutable poolManager;
    PairbandHook public immutable hook;
    address public immutable positionManager;
    address public protocolFeeRecipient;

    mapping(PoolId => address) public vaultOf;
    address[] public allVaults;

    event PairbandCreated(
        address indexed vault,
        address indexed hookAddr,
        PoolId indexed poolId,
        address curator,
        Currency currency0,
        Currency currency1
    );
    event ProtocolFeeRecipientUpdated(address indexed recipient);

    constructor(
        IPoolManager poolManager_,
        PairbandHook hook_,
        address positionManager_,
        address protocolFeeRecipient_,
        address owner_
    ) Ownable(owner_) {
        if (address(poolManager_) == address(0) || address(hook_) == address(0)) revert ZeroAddress();
        if (protocolFeeRecipient_ == address(0) || owner_ == address(0)) revert ZeroAddress();
        if (hook_.factory() != address(this)) revert HookMismatch();

        poolManager = poolManager_;
        hook = hook_;
        positionManager = positionManager_;
        protocolFeeRecipient = protocolFeeRecipient_;
    }

    /// @notice Create a Pairband vault for `key`, register on hook, initialize pool if needed.
    /// @param key Pool key (hooks must be this factory's hook).
    /// @param policy Vault policy (protocolFeeBps capped at 200).
    /// @param sqrtPriceX96 Initial price if the pool is uninitialized.
    /// @param name Share token name (e.g. "Pairband USDC-USD1").
    /// @param symbol Share token symbol (e.g. "pb-USDC-USD1").
    /// @param tickLower Initial band lower tick.
    /// @param tickUpper Initial band upper tick.
    /// @return vault Deployed vault address.
    /// @return poolId_ Pool id.
    function createPairband(
        PoolKey memory key,
        PairbandVault.Policy memory policy,
        uint160 sqrtPriceX96,
        string memory name,
        string memory symbol,
        int24 tickLower,
        int24 tickUpper
    ) external returns (PairbandVault vault, PoolId poolId_) {
        if (address(key.hooks) != address(hook)) revert HookMismatch();
        if (policy.protocolFeeBps > PROTOCOL_FEE_CAP_BPS) revert FeeCap();
        if (policy.curator == address(0)) revert ZeroAddress();
        if (tickUpper <= tickLower) revert InvalidBand();

        poolId_ = key.toId();
        if (vaultOf[poolId_] != address(0)) revert VaultExists();

        vault = new PairbandVault(
            poolManager,
            hook,
            positionManager,
            protocolFeeRecipient,
            key,
            policy,
            name,
            symbol,
            tickLower,
            tickUpper
        );

        hook.registerVault(key, address(vault));

        (uint160 existingSqrtPrice,,,) = poolManager.getSlot0(poolId_);
        if (existingSqrtPrice == 0) {
            poolManager.initialize(key, sqrtPriceX96);
        }

        vaultOf[poolId_] = address(vault);
        allVaults.push(address(vault));

        emit PairbandCreated(address(vault), address(hook), poolId_, policy.curator, key.currency0, key.currency1);
    }

    /// @notice Update protocol fee recipient (owner).
    function setProtocolFeeRecipient(address recipient) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        protocolFeeRecipient = recipient;
        emit ProtocolFeeRecipientUpdated(recipient);
    }

    /// @notice Number of vaults created.
    function vaultCount() external view returns (uint256) {
        return allVaults.length;
    }
}
