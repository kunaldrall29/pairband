// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {SeriesFactory} from "../../src/SeriesFactory.sol";
import {SeriesVault} from "../../src/SeriesVault.sol";
import {MockERC20} from "../MockERC20.sol";
import {GhostSeries} from "../ghost/IndependentSeriesModel.sol";
import {SeriesVaultHandler} from "./SeriesVaultHandler.sol";

/// @notice Stateful invariant suite: vault counters match independent O02 ghost; cross-series isolation.
/// @dev Not an audit. Local Anvil only. Arc-runtime gaps → O10.
contract SeriesVaultInvariantTest is StdInvariant, Test {
    SeriesFactory factory;
    SeriesVault vaultA;
    SeriesVault vaultB;
    bytes32 seriesA;
    bytes32 seriesB;
    MockERC20 usdc;
    MockERC20 eurc;
    SeriesVaultHandler handler;

    uint64 tradingStart = 1_000;
    uint64 exerciseStart = 5_000;
    uint64 exerciseEnd = 9_000;
    uint16 feeBps = 10;
    uint256 strike = 110;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        eurc = new MockERC20("Euro Coin", "EURC", 6);
        factory = new SeriesFactory(address(eurc), address(usdc), address(this));

        (seriesA,) = factory.createSeries(
            SeriesFactory.CreateParams({
                strikePerUnit6: strike,
                tradingStart: tradingStart,
                exerciseStart: exerciseStart,
                exerciseEnd: exerciseEnd,
                maxWriterUnits: 1e12,
                issuanceFeeBps: feeBps,
                feeRecipient: address(0xFEE),
                longName: "A Long",
                longSymbol: "aL",
                receiptName: "A WR",
                receiptSymbol: "aW"
            })
        );
        (seriesB,) = factory.createSeries(
            SeriesFactory.CreateParams({
                strikePerUnit6: strike,
                tradingStart: tradingStart,
                exerciseStart: exerciseStart,
                exerciseEnd: exerciseEnd,
                maxWriterUnits: 1e12,
                issuanceFeeBps: feeBps,
                feeRecipient: address(0xFEE),
                longName: "B Long",
                longSymbol: "bL",
                receiptName: "B WR",
                receiptSymbol: "bW"
            })
        );
        vaultA = SeriesVault(factory.vaultBySeriesId(seriesA));
        vaultB = SeriesVault(factory.vaultBySeriesId(seriesB));

        handler = new SeriesVaultHandler(
            factory,
            vaultA,
            vaultB,
            seriesA,
            seriesB,
            usdc,
            eurc,
            tradingStart,
            exerciseStart,
            exerciseEnd,
            feeBps,
            strike
        );
        // Pause control: factory owner is this test; expose via handler prank target
        factory.transferOwnership(address(handler));

        targetContract(address(handler));
        bytes4[] memory selectors = new bytes4[](8);
        selectors[0] = SeriesVaultHandler.warpRelative.selector;
        selectors[1] = SeriesVaultHandler.mint.selector;
        selectors[2] = SeriesVaultHandler.cancel.selector;
        selectors[3] = SeriesVaultHandler.transferLong.selector;
        selectors[4] = SeriesVaultHandler.transferReceipt.selector;
        selectors[5] = SeriesVaultHandler.exercise.selector;
        selectors[6] = SeriesVaultHandler.redeem.selector;
        selectors[7] = SeriesVaultHandler.donate.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));

        // seed trading so mint can succeed early
        vm.warp(tradingStart + 1);
    }

    function invariant_ghostMatchesVaultA() public view {
        _match(vaultA, handler.ghostAWriter(), handler.ghostAExercised(), handler.ghostARedeemed(), handler.ghostAUsdc(), handler.ghostAEurc(), handler.ghostAFinalized(), handler.ghostASnapW(), handler.ghostASnapU(), handler.ghostASnapE());
    }

    function invariant_ghostMatchesVaultB() public view {
        _match(vaultB, handler.ghostBWriter(), handler.ghostBExercised(), handler.ghostBRedeemed(), handler.ghostBUsdc(), handler.ghostBEurc(), handler.ghostBFinalized(), handler.ghostBSnapW(), handler.ghostBSnapU(), handler.ghostBSnapE());
    }

    function invariant_longSupplyEqualsWriterMinusExercised() public view {
        assertEq(
            vaultA.longToken().totalSupply(),
            vaultA.writerUnits() - vaultA.exercisedUnits(),
            "A long supply"
        );
        assertEq(
            vaultB.longToken().totalSupply(),
            vaultB.writerUnits() - vaultB.exercisedUnits(),
            "B long supply"
        );
    }

    function invariant_receiptSupplyEqualsWriterMinusRedeemed() public view {
        // receipts outstanding = writerUnits - redeemedUnits (redeem burns receipts)
        assertEq(vaultA.writerReceipt().totalSupply(), vaultA.writerUnits() - vaultA.redeemedUnits(), "A receipt");
        assertEq(vaultB.writerReceipt().totalSupply(), vaultB.writerUnits() - vaultB.redeemedUnits(), "B receipt");
    }

    function invariant_accountedReservesBoundedByBalances() public view {
        // Accounted ≤ token balance; donations can make balance strictly greater
        assertLe(vaultA.accountedUSDC6(), usdc.balanceOf(address(vaultA)), "A usdc bal");
        assertLe(vaultA.accountedEURC6(), eurc.balanceOf(address(vaultA)), "A eurc bal");
        assertLe(vaultB.accountedUSDC6(), usdc.balanceOf(address(vaultB)), "B usdc bal");
        assertLe(vaultB.accountedEURC6(), eurc.balanceOf(address(vaultB)), "B eurc bal");
    }

    function invariant_feeRecipientSeparateFromBacking() public view {
        // Fee is paid out immediately; never part of accountedUSDC
        assertEq(
            usdc.balanceOf(address(0xFEE)),
            handler.ghostAFee() + handler.ghostBFee(),
            "fees exact"
        );
    }

    function invariant_noCrossSeriesContamination() public view {
        // Each vault's accounted equals its ghost independently (already checked);
        // additionally, series ids map uniquely.
        assertTrue(factory.vaultBySeriesId(seriesA) == address(vaultA));
        assertTrue(factory.vaultBySeriesId(seriesB) == address(vaultB));
        assertTrue(address(vaultA) != address(vaultB));
    }

    function _match(
        SeriesVault v,
        uint256 w,
        uint256 ex,
        uint256 red,
        uint256 u,
        uint256 e,
        bool fin,
        uint256 sw,
        uint256 su,
        uint256 se
    ) internal view {
        assertEq(v.writerUnits(), w);
        assertEq(v.exercisedUnits(), ex);
        assertEq(v.redeemedUnits(), red);
        assertEq(v.accountedUSDC6(), u);
        assertEq(v.accountedEURC6(), e);
        if (fin || v.finalized()) {
            assertEq(v.finalized(), fin);
            if (fin) {
                assertEq(v.snapshotW0(), sw);
                assertEq(v.snapshotU0(), su);
                assertEq(v.snapshotE0(), se);
            }
        }
    }
}
