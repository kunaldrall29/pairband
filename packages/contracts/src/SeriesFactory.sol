// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SeriesVault} from "./SeriesVault.sol";

/// @notice Curated factory/registry for immutable series. Admin may pause new risk only.
contract SeriesFactory is Ownable {
    uint256 public constant UNDERLYING_PER_UNIT_6 = 100;
    uint256 public constant FEE_BPS_HARD_CAP = 50;
    uint256 public nextNonce;

    mapping(bytes32 => address) public vaultBySeriesId;
    mapping(bytes32 => bool) public newRiskPaused;
    mapping(address => bool) public isSeriesVault;

    address public immutable underlying; // EURC
    address public immutable settlement; // USDC
    uint8 public immutable expectedDecimals;

    event SeriesCreated(
        bytes32 indexed seriesId,
        address indexed vault,
        address longToken,
        address writerReceipt,
        uint256 strikePerUnit6,
        uint64 tradingStart,
        uint64 exerciseStart,
        uint64 exerciseEnd,
        uint256 maxWriterUnits,
        uint16 issuanceFeeBps
    );
    event NewRiskPauseChanged(bytes32 indexed seriesId, bool paused);

    error UnsupportedToken();
    error InvalidTerms();
    error SeriesExists();
    error UnknownSeries();

    constructor(address underlying_, address settlement_, address initialOwner) Ownable(initialOwner) {
        require(underlying_ != address(0) && settlement_ != address(0), "tokens");
        underlying = underlying_;
        settlement = settlement_;
        expectedDecimals = 6;
        _assertDecimals(underlying_);
        _assertDecimals(settlement_);
    }

    struct CreateParams {
        uint256 strikePerUnit6;
        uint64 tradingStart;
        uint64 exerciseStart;
        uint64 exerciseEnd;
        uint256 maxWriterUnits;
        uint16 issuanceFeeBps;
        address feeRecipient;
        string longName;
        string longSymbol;
        string receiptName;
        string receiptSymbol;
    }

    function createSeries(CreateParams calldata p) external onlyOwner returns (bytes32 seriesId, address vault) {
        if (p.strikePerUnit6 == 0) revert InvalidTerms();
        if (!(p.tradingStart < p.exerciseStart && p.exerciseStart < p.exerciseEnd)) revert InvalidTerms();
        if (p.maxWriterUnits == 0 || p.maxWriterUnits > 1e12) revert InvalidTerms();
        if (p.issuanceFeeBps > FEE_BPS_HARD_CAP) revert InvalidTerms();
        if (p.feeRecipient == address(0)) revert InvalidTerms();

        uint256 nonce = nextNonce++;
        seriesId = keccak256(
            abi.encode(
                block.chainid,
                address(this),
                underlying,
                settlement,
                UNDERLYING_PER_UNIT_6,
                p.strikePerUnit6,
                p.tradingStart,
                p.exerciseStart,
                p.exerciseEnd,
                nonce
            )
        );
        if (vaultBySeriesId[seriesId] != address(0)) revert SeriesExists();

        SeriesVault.Terms memory terms = SeriesVault.Terms({
            seriesId: seriesId,
            underlying: underlying,
            settlement: settlement,
            strikePerUnit6: p.strikePerUnit6,
            tradingStart: p.tradingStart,
            exerciseStart: p.exerciseStart,
            exerciseEnd: p.exerciseEnd,
            maxWriterUnits: p.maxWriterUnits,
            issuanceFeeBps: p.issuanceFeeBps,
            feeRecipient: p.feeRecipient,
            registry: address(this),
            longName: p.longName,
            longSymbol: p.longSymbol,
            receiptName: p.receiptName,
            receiptSymbol: p.receiptSymbol
        });

        SeriesVault v = new SeriesVault(terms);
        vault = address(v);
        vaultBySeriesId[seriesId] = vault;
        isSeriesVault[vault] = true;

        emit SeriesCreated(
            seriesId,
            vault,
            address(v.longToken()),
            address(v.writerReceipt()),
            p.strikePerUnit6,
            p.tradingStart,
            p.exerciseStart,
            p.exerciseEnd,
            p.maxWriterUnits,
            p.issuanceFeeBps
        );
    }

    function setNewRiskPaused(bytes32 seriesId, bool paused) external onlyOwner {
        if (vaultBySeriesId[seriesId] == address(0)) revert UnknownSeries();
        newRiskPaused[seriesId] = paused;
        emit NewRiskPauseChanged(seriesId, paused);
    }

    function _assertDecimals(address token) internal view {
        (bool ok, bytes memory data) = token.staticcall(abi.encodeWithSignature("decimals()"));
        require(ok && data.length >= 32, "decimals");
        require(abi.decode(data, (uint8)) == expectedDecimals, "dec");
    }
}
