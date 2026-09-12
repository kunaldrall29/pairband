// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {Constants} from "@uniswap/v4-core/test/utils/Constants.sol";
import {CurrencySettler} from "@uniswap/v4-core/test/utils/CurrencySettler.sol";

import {PairbandHook} from "../src/PairbandHook.sol";

contract PairbandHookTest is Test, Deployers {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;
    using StateLibrary for IPoolManager;

    PairbandHook internal hook;
    address internal vaultAddr;
    address internal stranger = makeAddr("stranger");

    uint160 internal constant HOOK_FLAGS = uint160(
        Hooks.BEFORE_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_REMOVE_LIQUIDITY_FLAG
            | Hooks.AFTER_SWAP_FLAG
    );

    function setUp() public {
        deployFreshManagerAndRouters();
        deployMintAndApprove2Currencies();

        // Deploy vault helper first so we know its address for registration.
        vaultAddr = address(new VaultLiquidityHelper(manager));

        address hookAddr = address(uint160(HOOK_FLAGS));
        deployCodeTo(
            "src/PairbandHook.sol:PairbandHook",
            abi.encode(address(manager), address(this), address(0)),
            hookAddr
        );
        hook = PairbandHook(hookAddr);

        key = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });
        VaultLiquidityHelper(vaultAddr).setKey(key);

        hook.registerVault(key, vaultAddr);
        manager.initialize(key, Constants.SQRT_PRICE_1_1);
    }

    function test_getHookPermissions_matchFlags() public view {
        Hooks.Permissions memory p = hook.getHookPermissions();
        assertTrue(p.beforeInitialize);
        assertTrue(p.beforeAddLiquidity);
        assertTrue(p.beforeRemoveLiquidity);
        assertTrue(p.afterSwap);
        assertFalse(p.beforeSwap);
        assertFalse(p.afterAddLiquidity);
        assertFalse(p.beforeSwapReturnDelta);
        assertFalse(p.afterSwapReturnDelta);
        assertEq(uint160(address(hook)) & Hooks.ALL_HOOK_MASK, HOOK_FLAGS);
        assertEq(hook.requiredFlags(), HOOK_FLAGS);
    }

    function test_registerVault_onlyFactory() public {
        PoolKey memory other = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 500,
            tickSpacing: 10,
            hooks: IHooks(address(hook))
        });
        vm.prank(stranger);
        vm.expectRevert(PairbandHook.NotFactory.selector);
        hook.registerVault(other, vaultAddr);
    }

    function test_registerVault_twiceReverts() public {
        vm.expectRevert(PairbandHook.VaultAlreadySet.selector);
        hook.registerVault(key, vaultAddr);
    }

    function test_eoaModifyLiquidity_reverts() public {
        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: -60,
            tickUpper: 60,
            liquidityDelta: 1e18,
            salt: bytes32(0)
        });
        vm.expectRevert();
        modifyLiquidityRouter.modifyLiquidity(key, params, Constants.ZERO_BYTES);
    }

    function test_vaultModifyLiquidity_succeeds() public {
        deal(Currency.unwrap(currency0), vaultAddr, 100 ether);
        deal(Currency.unwrap(currency1), vaultAddr, 100 ether);
        VaultLiquidityHelper(vaultAddr).addLiquidity(1e18);
        assertGt(manager.getLiquidity(key.toId()), 0);
    }

    function test_afterSwap_emitsSwapTouched() public {
        deal(Currency.unwrap(currency0), vaultAddr, 1000 ether);
        deal(Currency.unwrap(currency1), vaultAddr, 1000 ether);
        VaultLiquidityHelper(vaultAddr).addLiquidity(10e18);

        vm.expectEmit(true, false, false, false, address(hook));
        emit PairbandHook.SwapTouched(key.toId(), int24(0), uint160(0));
        swap(key, true, -1e17, Constants.ZERO_BYTES);
    }

    function test_beforeInitialize_requiresVault() public {
        address fresh = address(uint160(uint160(HOOK_FLAGS) | (uint160(1) << 20)));
        fresh = address((uint160(fresh) & ~Hooks.ALL_HOOK_MASK) | HOOK_FLAGS);
        deployCodeTo(
            "src/PairbandHook.sol:PairbandHook",
            abi.encode(address(manager), address(this), address(0)),
            fresh
        );
        PoolKey memory k2 = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 10000,
            tickSpacing: 200,
            hooks: IHooks(fresh)
        });
        // PoolManager wraps hook reverts; assert initialize fails without a registered vault.
        vm.expectRevert();
        manager.initialize(k2, Constants.SQRT_PRICE_1_1);
    }
}

/// @dev Vault stand-in: unlocks PoolManager and adds liquidity (hook sender == this).
contract VaultLiquidityHelper is IUnlockCallback {
    using CurrencySettler for Currency;

    IPoolManager public immutable manager;
    PoolKey public key;

    constructor(IPoolManager manager_) {
        manager = manager_;
    }

    function setKey(PoolKey memory key_) external {
        key = key_;
    }

    function addLiquidity(uint256 liquidity) external {
        manager.unlock(abi.encode(liquidity));
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(manager), "not pm");
        uint256 liquidity = abi.decode(data, (uint256));
        (BalanceDelta delta,) = manager.modifyLiquidity(
            key,
            ModifyLiquidityParams({
                tickLower: -60,
                tickUpper: 60,
                liquidityDelta: int256(liquidity),
                salt: bytes32(0)
            }),
            ""
        );
        _settle(delta);
        return "";
    }

    function _settle(BalanceDelta delta) internal {
        int128 a0 = delta.amount0();
        int128 a1 = delta.amount1();
        if (a0 < 0) key.currency0.settle(manager, address(this), uint256(uint128(-a0)), false);
        else if (a0 > 0) key.currency0.take(manager, address(this), uint256(uint128(a0)), false);
        if (a1 < 0) key.currency1.settle(manager, address(this), uint256(uint128(-a1)), false);
        else if (a1 > 0) key.currency1.take(manager, address(this), uint256(uint128(a1)), false);
    }
}
