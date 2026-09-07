// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ClaimToken} from "./ClaimToken.sol";

/// @notice Nonupgradeable per-series collateral vault for EURC puts backed by USDC.
/// @dev Not audited. Recipients are always msg.sender (no arbitrary recipient args).
contract SeriesVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant UNDERLYING_PER_UNIT_6 = 100;
    uint256 public constant FEE_BPS_HARD_CAP = 50;
    uint256 public constant TECHNICAL_UNIT_CAP = 1e12;

    bytes32 public immutable seriesId;
    address public immutable underlying; // EURC
    address public immutable settlement; // USDC ERC-20
    uint256 public immutable strikePerUnit6; // C
    uint64 public immutable tradingStart;
    uint64 public immutable exerciseStart;
    uint64 public immutable exerciseEnd;
    uint256 public immutable maxWriterUnits;
    uint16 public immutable issuanceFeeBps;
    address public immutable feeRecipient;
    address public immutable registry;

    ClaimToken public immutable longToken;
    ClaimToken public immutable writerReceipt;

    uint256 public writerUnits;
    uint256 public exercisedUnits;
    uint256 public redeemedUnits;
    uint256 public accountedUSDC6;
    uint256 public accountedEURC6;

    bool public finalized;
    uint256 public snapshotW0;
    uint256 public snapshotU0;
    uint256 public snapshotE0;

    error InvalidAmount();
    error InvalidPhase();
    error CapacityExceeded();
    error NewRiskPaused();
    error InsufficientClaims();
    error AlreadyFinalized();
    error NotMatured();
    error CancelAfterExercise();
    error TransferAmountMismatch();

    event OptionsMinted(
        bytes32 indexed seriesId, address indexed account, uint256 units, uint256 collateral6, uint256 fee6
    );
    event OptionsCancelled(bytes32 indexed seriesId, address indexed account, uint256 units, uint256 returnedUSDC6);
    event OptionsExercised(
        bytes32 indexed seriesId, address indexed account, uint256 units, uint256 eurcIn6, uint256 usdcOut6
    );
    event SeriesFinalized(bytes32 indexed seriesId, uint256 writerUnits, uint256 usdc6, uint256 eurc6);
    event WriterRedeemed(
        bytes32 indexed seriesId, address indexed account, uint256 units, uint256 usdcOut6, uint256 eurcOut6
    );

    struct Terms {
        bytes32 seriesId;
        address underlying;
        address settlement;
        uint256 strikePerUnit6;
        uint64 tradingStart;
        uint64 exerciseStart;
        uint64 exerciseEnd;
        uint256 maxWriterUnits;
        uint16 issuanceFeeBps;
        address feeRecipient;
        address registry;
        string longName;
        string longSymbol;
        string receiptName;
        string receiptSymbol;
    }

    constructor(Terms memory t) {
        require(t.underlying != address(0) && t.settlement != address(0), "tokens");
        require(t.strikePerUnit6 > 0, "strike");
        require(t.tradingStart < t.exerciseStart && t.exerciseStart < t.exerciseEnd, "times");
        require(t.maxWriterUnits > 0 && t.maxWriterUnits <= TECHNICAL_UNIT_CAP, "cap");
        require(t.issuanceFeeBps <= FEE_BPS_HARD_CAP, "fee");
        require(t.feeRecipient != address(0) && t.registry != address(0), "auth");

        seriesId = t.seriesId;
        underlying = t.underlying;
        settlement = t.settlement;
        strikePerUnit6 = t.strikePerUnit6;
        tradingStart = t.tradingStart;
        exerciseStart = t.exerciseStart;
        exerciseEnd = t.exerciseEnd;
        maxWriterUnits = t.maxWriterUnits;
        issuanceFeeBps = t.issuanceFeeBps;
        feeRecipient = t.feeRecipient;
        registry = t.registry;

        longToken = new ClaimToken(t.longName, t.longSymbol, address(this), 6);
        writerReceipt = new ClaimToken(t.receiptName, t.receiptSymbol, address(this), 6);
    }

    function phase() public view returns (uint8) {
        // 0 scheduled, 1 trading, 2 exercise, 3 matured
        uint64 t = uint64(block.timestamp);
        if (t < tradingStart) return 0;
        if (t < exerciseStart) return 1;
        if (t < exerciseEnd) return 2;
        return 3;
    }

    function newRiskPaused() public view returns (bool) {
        return ISeriesRegistry(registry).newRiskPaused(seriesId);
    }

    function previewMint(uint256 q)
        external
        view
        returns (uint256 collateral6, uint256 fee6)
    {
        collateral6 = q * strikePerUnit6;
        fee6 = _ceilFee(collateral6);
    }

    function mint(uint256 q) external nonReentrant {
        if (q == 0) revert InvalidAmount();
        if (phase() != 1) revert InvalidPhase();
        if (newRiskPaused()) revert NewRiskPaused();
        if (writerUnits + q > maxWriterUnits) revert CapacityExceeded();

        uint256 collateral6 = q * strikePerUnit6;
        uint256 fee6 = _ceilFee(collateral6);

        _pullExact(settlement, msg.sender, collateral6);
        if (fee6 > 0) {
            _pullExact(settlement, msg.sender, fee6);
            IERC20(settlement).safeTransfer(feeRecipient, fee6);
        }

        writerUnits += q;
        accountedUSDC6 += collateral6;
        longToken.mint(msg.sender, q);
        writerReceipt.mint(msg.sender, q);

        emit OptionsMinted(seriesId, msg.sender, q, collateral6, fee6);
    }

    function cancel(uint256 q) external nonReentrant {
        if (q == 0) revert InvalidAmount();
        if (phase() != 1) revert InvalidPhase();
        if (exercisedUnits != 0) revert CancelAfterExercise();
        if (longToken.balanceOf(msg.sender) < q || writerReceipt.balanceOf(msg.sender) < q) {
            revert InsufficientClaims();
        }

        uint256 returnedUSDC6 = q * strikePerUnit6;
        longToken.burn(msg.sender, q);
        writerReceipt.burn(msg.sender, q);
        writerUnits -= q;
        accountedUSDC6 -= returnedUSDC6;
        IERC20(settlement).safeTransfer(msg.sender, returnedUSDC6);

        emit OptionsCancelled(seriesId, msg.sender, q, returnedUSDC6);
    }

    function exercise(uint256 q) external nonReentrant {
        if (q == 0) revert InvalidAmount();
        if (phase() != 2) revert InvalidPhase();
        if (longToken.balanceOf(msg.sender) < q) revert InsufficientClaims();

        uint256 eurcIn6 = q * UNDERLYING_PER_UNIT_6;
        uint256 usdcOut6 = q * strikePerUnit6;

        _pullExact(underlying, msg.sender, eurcIn6);
        longToken.burn(msg.sender, q);
        exercisedUnits += q;
        accountedUSDC6 -= usdcOut6;
        accountedEURC6 += eurcIn6;
        IERC20(settlement).safeTransfer(msg.sender, usdcOut6);

        emit OptionsExercised(seriesId, msg.sender, q, eurcIn6, usdcOut6);
    }

    function finalize() public {
        if (finalized) return;
        if (phase() != 3) revert NotMatured();
        snapshotW0 = writerUnits;
        snapshotU0 = accountedUSDC6;
        snapshotE0 = accountedEURC6;
        finalized = true;
        emit SeriesFinalized(seriesId, snapshotW0, snapshotU0, snapshotE0);
    }

    function previewRedeem(uint256 q) external view returns (uint256 usdc6, uint256 eurc6) {
        uint256 W0 = finalized ? snapshotW0 : writerUnits;
        uint256 U0 = finalized ? snapshotU0 : accountedUSDC6;
        uint256 E0 = finalized ? snapshotE0 : accountedEURC6;
        uint256 R = redeemedUnits;
        if (W0 == 0) return (0, 0);
        usdc6 = ((R + q) * U0) / W0 - (R * U0) / W0;
        eurc6 = ((R + q) * E0) / W0 - (R * E0) / W0;
    }

    function redeem(uint256 q) external nonReentrant {
        if (q == 0) revert InvalidAmount();
        if (phase() != 3) revert NotMatured();
        finalize();
        if (writerReceipt.balanceOf(msg.sender) < q) revert InsufficientClaims();
        if (redeemedUnits + q > snapshotW0) revert InvalidAmount();

        uint256 usdc6;
        uint256 eurc6;
        if (snapshotW0 != 0) {
            usdc6 = ((redeemedUnits + q) * snapshotU0) / snapshotW0 - (redeemedUnits * snapshotU0) / snapshotW0;
            eurc6 = ((redeemedUnits + q) * snapshotE0) / snapshotW0 - (redeemedUnits * snapshotE0) / snapshotW0;
        }

        writerReceipt.burn(msg.sender, q);
        redeemedUnits += q;
        accountedUSDC6 -= usdc6;
        accountedEURC6 -= eurc6;

        if (usdc6 > 0) IERC20(settlement).safeTransfer(msg.sender, usdc6);
        if (eurc6 > 0) IERC20(underlying).safeTransfer(msg.sender, eurc6);

        emit WriterRedeemed(seriesId, msg.sender, q, usdc6, eurc6);
    }

    function _ceilFee(uint256 collateral6) internal view returns (uint256) {
        if (issuanceFeeBps == 0) return 0;
        return (collateral6 * uint256(issuanceFeeBps) + 9999) / 10000;
    }

    function _pullExact(address token, address from, uint256 amount) internal {
        uint256 beforeBal = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(from, address(this), amount);
        uint256 received = IERC20(token).balanceOf(address(this)) - beforeBal;
        if (received != amount) revert TransferAmountMismatch();
    }
}

interface ISeriesRegistry {
    function newRiskPaused(bytes32 seriesId) external view returns (bool);
}
