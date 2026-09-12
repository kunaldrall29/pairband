// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {Position} from "@uniswap/v4-core/src/libraries/Position.sol";

import {CurrencySettler} from "@openzeppelin/uniswap-hooks/src/utils/CurrencySettler.sol";

import {BandMath} from "./libraries/BandMath.sol";
import {ShareMath} from "./libraries/ShareMath.sol";
import {LiquidityAmounts} from "./libraries/LiquidityAmounts.sol";
import {PairbandHook} from "./PairbandHook.sol";

/// @title PairbandVault
/// @notice Curator-gated Uniswap v4 range vault. LPs deposit both tokens for ERC-20 shares;
///         the vault owns one banded position; an agent may propose; only the curator executes.
/// @dev Liquidity via PoolManager.modifyLiquidity (salt=0). Unlock locker is this vault so
///      PairbandHook sees sender==vault. `positionManager` is recorded for chain config;
///      PositionManager NFT minting is equivalent ownership and can be wired per-chain in scripts.
contract PairbandVault is ERC20, ReentrancyGuard, IUnlockCallback {
    using SafeERC20 for IERC20;
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;
    using CurrencyLibrary for Currency;
    using CurrencySettler for Currency;

    uint16 public constant BPS_DENOM = 10_000;
    uint16 public constant PROTOCOL_FEE_CAP_BPS = 200;
    uint256 public constant DEAD_SHARES = 1_000;
    address public constant DEAD = address(0x000000000000000000000000000000000000dEaD);
    bytes32 public constant POSITION_SALT = bytes32(0);

    error NotCurator();
    error NotAgent();
    error TooWide();
    error ShiftCapped();
    error DelayPending();
    error CooldownPending();
    error NoProposal();
    error Locked();
    error ZeroAmount();
    error InvalidTicks();
    error FeeCap();
    error Slippage();
    error NotPoolManager();
    error MinBootstrap();

    struct Band {
        int24 tickLower;
        int24 tickUpper;
        uint256 positionId;
        uint48 lastRebalanceAt;
    }

    struct Policy {
        address curator;
        address agent;
        uint24 maxWidth;
        uint24 maxShift;
        uint32 minCooldown;
        uint16 protocolFeeBps;
        uint16 performanceFeeBps;
        uint32 proposalDelay;
    }

    struct Proposal {
        int24 tickLower;
        int24 tickUpper;
        uint128 amount0Min;
        uint128 amount1Min;
        address proposer;
        uint48 postedAt;
        bool active;
    }

    enum Action {
        Deposit,
        Withdraw,
        Rebalance
    }

    IPoolManager public immutable poolManager;
    PairbandHook public immutable hook;
    address public immutable positionManager;
    address public protocolFeeRecipient;

    PoolKey public poolKey;
    Policy public policy;
    Band public band;
    Proposal public proposal;

    /// @notice Deposits/withdrawals revert while `block.number <= rebalanceUnlockBlock`.
    uint64 public rebalanceUnlockBlock;

    uint8 private immutable _dec0;
    uint8 private immutable _dec1;

    event Deposited(address indexed user, uint256 amount0, uint256 amount1, uint256 shares, uint128 liquidity);
    event Withdrawn(address indexed user, uint256 shares, uint256 amount0, uint256 amount1);
    event Proposed(
        address indexed proposer, int24 tickLower, int24 tickUpper, uint128 amount0Min, uint128 amount1Min
    );
    event ProposalRejected(address indexed curator);
    event Rebalanced(
        address indexed curator,
        int24 tickLower,
        int24 tickUpper,
        uint256 protocolFee0,
        uint256 protocolFee1,
        uint256 curatorShares
    );
    event CuratorTransferred(address indexed previous, address indexed next);
    event ProtocolFeeRecipientUpdated(address indexed recipient);

    modifier onlyCurator() {
        if (msg.sender != policy.curator) revert NotCurator();
        _;
    }

    constructor(
        IPoolManager poolManager_,
        PairbandHook hook_,
        address positionManager_,
        address protocolFeeRecipient_,
        PoolKey memory key_,
        Policy memory policy_,
        string memory name_,
        string memory symbol_,
        int24 tickLower_,
        int24 tickUpper_
    ) ERC20(name_, symbol_) {
        if (policy_.curator == address(0)) revert NotCurator();
        if (policy_.protocolFeeBps > PROTOCOL_FEE_CAP_BPS) revert FeeCap();
        if (protocolFeeRecipient_ == address(0)) revert ZeroAmount();
        BandMath.requireValidBand(tickLower_, tickUpper_, key_.tickSpacing);
        if (BandMath.width(tickLower_, tickUpper_) > policy_.maxWidth) revert TooWide();

        poolManager = poolManager_;
        hook = hook_;
        positionManager = positionManager_;
        protocolFeeRecipient = protocolFeeRecipient_;
        poolKey = key_;
        policy = policy_;
        band = Band({tickLower: tickLower_, tickUpper: tickUpper_, positionId: 1, lastRebalanceAt: 0});

        _dec0 = IERC20Metadata(Currency.unwrap(key_.currency0)).decimals();
        _dec1 = IERC20Metadata(Currency.unwrap(key_.currency1)).decimals();
    }

    function poolId() public view returns (PoolId) {
        return poolKey.toId();
    }

    /// @notice Liquidity of the vault's sole position.
    function totalLiquidity() public view returns (uint128) {
        bytes32 key = Position.calculatePositionKey(address(this), band.tickLower, band.tickUpper, POSITION_SALT);
        return poolManager.getPositionLiquidity(poolId(), key);
    }

    /// @notice Preview shares for a deposit at current spot.
    function previewDeposit(uint256 amount0, uint256 amount1)
        external
        view
        returns (uint256 shares, uint128 liquidity)
    {
        if (amount0 == 0 || amount1 == 0) revert ZeroAmount();
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId());
        liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            TickMath.getSqrtPriceAtTick(band.tickLower),
            TickMath.getSqrtPriceAtTick(band.tickUpper),
            amount0,
            amount1
        );
        uint256 supply = totalSupply();
        if (supply == 0) {
            if (uint256(liquidity) <= DEAD_SHARES) revert MinBootstrap();
            shares = uint256(liquidity) - DEAD_SHARES;
        } else {
            shares = ShareMath.sharesForLiquidity(liquidity, supply, totalLiquidity());
        }
    }

    /// @notice Preview token amounts returned when burning `shares`.
    function previewWithdraw(uint256 shares) external view returns (uint256 amount0, uint256 amount1) {
        if (shares == 0) revert ZeroAmount();
        uint256 liqOut = ShareMath.liquidityForShares(shares, totalSupply(), totalLiquidity());
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId());
        (amount0, amount1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtPriceX96,
            TickMath.getSqrtPriceAtTick(band.tickLower),
            TickMath.getSqrtPriceAtTick(band.tickUpper),
            uint128(liqOut)
        );
    }

    /// @notice Deposit both tokens; mint shares. Reverts during rebalance lock.
    function deposit(uint256 amount0, uint256 amount1, uint256 minShares)
        external
        nonReentrant
        returns (uint256 shares, uint128 liquidity)
    {
        if (block.number <= rebalanceUnlockBlock) revert Locked();
        if (amount0 == 0 || amount1 == 0) revert ZeroAmount();

        IERC20(Currency.unwrap(poolKey.currency0)).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(Currency.unwrap(poolKey.currency1)).safeTransferFrom(msg.sender, address(this), amount1);

        bytes memory result =
            poolManager.unlock(abi.encode(Action.Deposit, msg.sender, amount0, amount1, uint256(0)));
        (shares, liquidity) = abi.decode(result, (uint256, uint128));
        if (shares < minShares) revert Slippage();
        emit Deposited(msg.sender, amount0, amount1, shares, liquidity);
    }

    /// @notice Burn shares; withdraw proportional tokens from the band.
    function withdraw(uint256 shares, uint256 amount0Min, uint256 amount1Min)
        external
        nonReentrant
        returns (uint256 amount0, uint256 amount1)
    {
        if (block.number <= rebalanceUnlockBlock) revert Locked();
        if (shares == 0 || shares > balanceOf(msg.sender)) revert ZeroAmount();

        bytes memory result =
            poolManager.unlock(abi.encode(Action.Withdraw, msg.sender, shares, uint256(0), uint256(0)));
        (amount0, amount1) = abi.decode(result, (uint256, uint256));
        if (amount0 < amount0Min || amount1 < amount1Min) revert Slippage();
        emit Withdrawn(msg.sender, shares, amount0, amount1);
    }

    /// @notice Propose a new band. If agent is set, only agent or curator may propose.
    function proposeRebalance(int24 tickLower, int24 tickUpper, uint128 amount0Min, uint128 amount1Min) external {
        Policy memory p = policy;
        if (p.agent != address(0) && msg.sender != p.agent && msg.sender != p.curator) revert NotAgent();

        int24 spacing = poolKey.tickSpacing;
        tickLower = BandMath.align(tickLower, spacing);
        tickUpper = BandMath.align(tickUpper, spacing);
        BandMath.requireValidBand(tickLower, tickUpper, spacing);
        if (BandMath.width(tickLower, tickUpper) > p.maxWidth) revert TooWide();

        proposal = Proposal({
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Min: amount0Min,
            amount1Min: amount1Min,
            proposer: msg.sender,
            postedAt: uint48(block.timestamp),
            active: true
        });
        emit Proposed(msg.sender, tickLower, tickUpper, amount0Min, amount1Min);
    }

    /// @notice Curator rejects the active proposal.
    function rejectProposal() external onlyCurator {
        if (!proposal.active) revert NoProposal();
        delete proposal;
        emit ProposalRejected(msg.sender);
    }

    /// @notice Curator executes the active proposal after delay + cooldown.
    /// @dev Shift := |ΔtickLower| + |ΔtickUpper| (BandMath.shift).
    function executeRebalance() external onlyCurator nonReentrant {
        Proposal memory prop = proposal;
        if (!prop.active) revert NoProposal();
        Policy memory p = policy;

        if (block.timestamp < uint256(prop.postedAt) + p.proposalDelay) revert DelayPending();
        if (band.lastRebalanceAt != 0 && block.timestamp < uint256(band.lastRebalanceAt) + p.minCooldown) {
            revert CooldownPending();
        }
        if (BandMath.shift(band.tickLower, band.tickUpper, prop.tickLower, prop.tickUpper) > p.maxShift) {
            revert ShiftCapped();
        }

        bytes memory result =
            poolManager.unlock(abi.encode(Action.Rebalance, msg.sender, uint256(0), uint256(0), uint256(0)));
        (uint256 protocolFee0, uint256 protocolFee1, uint256 curatorShares) =
            abi.decode(result, (uint256, uint256, uint256));
        emit Rebalanced(msg.sender, band.tickLower, band.tickUpper, protocolFee0, protocolFee1, curatorShares);
    }

    /// @notice Transfer curator. Instant on testnet; add 7-day delay for mainnet.
    function transferCurator(address newCurator) external onlyCurator {
        if (newCurator == address(0)) revert NotCurator();
        // MAINNET TODO: enforce 7-day timelock before curator transfer.
        address prev = policy.curator;
        policy.curator = newCurator;
        emit CuratorTransferred(prev, newCurator);
    }

    /// @notice Update protocol fee recipient.
    function setProtocolFeeRecipient(address recipient) external {
        if (msg.sender != protocolFeeRecipient && msg.sender != policy.curator) revert NotCurator();
        if (recipient == address(0)) revert ZeroAmount();
        protocolFeeRecipient = recipient;
        emit ProtocolFeeRecipientUpdated(recipient);
    }

    /// @inheritdoc IUnlockCallback
    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        (Action action, address user, uint256 a, uint256 b,) =
            abi.decode(data, (Action, address, uint256, uint256, uint256));
        if (action == Action.Deposit) return _cbDeposit(user, a, b);
        if (action == Action.Withdraw) return _cbWithdraw(user, a);
        return _cbRebalance();
    }

    function _cbDeposit(address user, uint256 amount0, uint256 amount1) internal returns (bytes memory) {
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId());
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            TickMath.getSqrtPriceAtTick(band.tickLower),
            TickMath.getSqrtPriceAtTick(band.tickUpper),
            amount0,
            amount1
        );
        if (liquidity == 0) revert ZeroAmount();

        uint256 supply = totalSupply();
        uint256 shares;
        if (supply == 0) {
            if (uint256(liquidity) <= DEAD_SHARES) revert MinBootstrap();
            shares = uint256(liquidity) - DEAD_SHARES;
            _mint(DEAD, DEAD_SHARES);
        } else {
            shares = ShareMath.sharesForLiquidity(liquidity, supply, totalLiquidity());
            if (shares == 0) revert ZeroAmount();
        }

        (BalanceDelta delta,) = poolManager.modifyLiquidity(
            poolKey,
            ModifyLiquidityParams({
                tickLower: band.tickLower,
                tickUpper: band.tickUpper,
                liquidityDelta: int256(uint256(liquidity)),
                salt: POSITION_SALT
            }),
            ""
        );
        _settleDelta(delta);
        _refundDust(user);
        _mint(user, shares);
        return abi.encode(shares, liquidity);
    }

    function _cbWithdraw(address user, uint256 shares) internal returns (bytes memory) {
        uint256 liqOut = ShareMath.liquidityForShares(shares, totalSupply(), totalLiquidity());
        if (liqOut == 0) revert ZeroAmount();
        _burn(user, shares);

        (BalanceDelta delta,) = poolManager.modifyLiquidity(
            poolKey,
            ModifyLiquidityParams({
                tickLower: band.tickLower,
                tickUpper: band.tickUpper,
                liquidityDelta: -int256(liqOut),
                salt: POSITION_SALT
            }),
            ""
        );
        _settleDelta(delta);

        uint256 bal0 = poolKey.currency0.balanceOfSelf();
        uint256 bal1 = poolKey.currency1.balanceOfSelf();
        if (bal0 > 0) IERC20(Currency.unwrap(poolKey.currency0)).safeTransfer(user, bal0);
        if (bal1 > 0) IERC20(Currency.unwrap(poolKey.currency1)).safeTransfer(user, bal1);
        return abi.encode(bal0, bal1);
    }

    function _cbRebalance() internal returns (bytes memory) {
        Proposal memory prop = proposal;
        Policy memory p = policy;
        uint128 liq = totalLiquidity();
        uint256 fee0;
        uint256 fee1;

        if (liq > 0) {
            (, BalanceDelta feesAccrued) = poolManager.modifyLiquidity(
                poolKey,
                ModifyLiquidityParams({
                    tickLower: band.tickLower,
                    tickUpper: band.tickUpper,
                    liquidityDelta: 0,
                    salt: POSITION_SALT
                }),
                ""
            );
            if (feesAccrued.amount0() > 0) fee0 = uint256(int256(feesAccrued.amount0()));
            if (feesAccrued.amount1() > 0) fee1 = uint256(int256(feesAccrued.amount1()));
            if (fee0 > 0 || fee1 > 0) _settleDelta(feesAccrued);

            (BalanceDelta principalDelta,) = poolManager.modifyLiquidity(
                poolKey,
                ModifyLiquidityParams({
                    tickLower: band.tickLower,
                    tickUpper: band.tickUpper,
                    liquidityDelta: -int256(uint256(liq)),
                    salt: POSITION_SALT
                }),
                ""
            );
            _settleDelta(principalDelta);
        }

        (uint256 protocolFee0, uint256 protocolFee1, uint256 curatorShares) = _splitFees(fee0, fee1, p);

        uint256 bal0 = poolKey.currency0.balanceOfSelf();
        uint256 bal1 = poolKey.currency1.balanceOfSelf();
        if (bal0 < prop.amount0Min || bal1 < prop.amount1Min) revert Slippage();

        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId());
        uint128 newLiq = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            TickMath.getSqrtPriceAtTick(prop.tickLower),
            TickMath.getSqrtPriceAtTick(prop.tickUpper),
            bal0,
            bal1
        );
        if (newLiq == 0) revert ZeroAmount();

        (BalanceDelta mintDelta,) = poolManager.modifyLiquidity(
            poolKey,
            ModifyLiquidityParams({
                tickLower: prop.tickLower,
                tickUpper: prop.tickUpper,
                liquidityDelta: int256(uint256(newLiq)),
                salt: POSITION_SALT
            }),
            ""
        );
        _settleDelta(mintDelta);

        band.tickLower = prop.tickLower;
        band.tickUpper = prop.tickUpper;
        band.lastRebalanceAt = uint48(block.timestamp);
        band.positionId = 1;
        delete proposal;
        rebalanceUnlockBlock = uint64(block.number + 3);

        return abi.encode(protocolFee0, protocolFee1, curatorShares);
    }

    /// @dev Protocol cut of collected fees in tokens; performance cut mints shares to curator.
    ///      Phase 0 stables: decimal-normalize and treat 1:1. No volatile TWAP path.
    function _splitFees(uint256 fee0, uint256 fee1, Policy memory p)
        internal
        returns (uint256 protocolFee0, uint256 protocolFee1, uint256 curatorShares)
    {
        if (fee0 == 0 && fee1 == 0) return (0, 0, 0);

        protocolFee0 = (fee0 * p.protocolFeeBps) / BPS_DENOM;
        protocolFee1 = (fee1 * p.protocolFeeBps) / BPS_DENOM;
        if (protocolFee0 > 0) {
            IERC20(Currency.unwrap(poolKey.currency0)).safeTransfer(protocolFeeRecipient, protocolFee0);
        }
        if (protocolFee1 > 0) {
            IERC20(Currency.unwrap(poolKey.currency1)).safeTransfer(protocolFeeRecipient, protocolFee1);
        }

        uint256 rem0 = fee0 - protocolFee0;
        uint256 rem1 = fee1 - protocolFee1;
        uint256 perf0 = (rem0 * p.performanceFeeBps) / BPS_DENOM;
        uint256 perf1 = (rem1 * p.performanceFeeBps) / BPS_DENOM;
        uint256 perfValue = _normalize(perf0, _dec0) + _normalize(perf1, _dec1);
        if (perfValue == 0) return (protocolFee0, protocolFee1, 0);

        uint256 supply = totalSupply();
        uint256 nav = _normalize(poolKey.currency0.balanceOfSelf(), _dec0)
            + _normalize(poolKey.currency1.balanceOfSelf(), _dec1);
        if (supply == 0 || nav == 0) {
            curatorShares = perfValue;
        } else {
            curatorShares = ShareMath.mulDivDown(perfValue, supply, nav);
        }
        if (curatorShares > 0) _mint(p.curator, curatorShares);
    }

    function _normalize(uint256 amount, uint8 decimals_) internal pure returns (uint256) {
        if (decimals_ == 18) return amount;
        if (decimals_ < 18) return amount * (10 ** (18 - decimals_));
        return amount / (10 ** (decimals_ - 18));
    }

    function _settleDelta(BalanceDelta delta) internal {
        int128 a0 = delta.amount0();
        int128 a1 = delta.amount1();
        if (a0 < 0) poolKey.currency0.settle(poolManager, address(this), uint256(uint128(-a0)), false);
        else if (a0 > 0) poolKey.currency0.take(poolManager, address(this), uint256(uint128(a0)), false);
        if (a1 < 0) poolKey.currency1.settle(poolManager, address(this), uint256(uint128(-a1)), false);
        else if (a1 > 0) poolKey.currency1.take(poolManager, address(this), uint256(uint128(a1)), false);
    }

    function _refundDust(address user) internal {
        uint256 bal0 = poolKey.currency0.balanceOfSelf();
        uint256 bal1 = poolKey.currency1.balanceOfSelf();
        if (bal0 > 0) IERC20(Currency.unwrap(poolKey.currency0)).safeTransfer(user, bal0);
        if (bal1 > 0) IERC20(Currency.unwrap(poolKey.currency1)).safeTransfer(user, bal1);
    }
}
