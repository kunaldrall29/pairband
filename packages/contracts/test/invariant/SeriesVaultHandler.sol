// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {SeriesFactory} from "../../src/SeriesFactory.sol";
import {SeriesVault} from "../../src/SeriesVault.sol";
import {MockERC20} from "../MockERC20.sol";
import {GhostSeries, GhostSeriesLib} from "../ghost/IndependentSeriesModel.sol";

/// @notice Foundry invariant handler: randomized vault lifecycle vs independent ghost model.
contract SeriesVaultHandler is Test {
    using GhostSeriesLib for GhostSeries;

    SeriesFactory public factory;
    SeriesVault public vaultA;
    SeriesVault public vaultB;
    bytes32 public seriesA;
    bytes32 public seriesB;
    MockERC20 public usdc;
    MockERC20 public eurc;

    address[] public actors;

    GhostSeries internal ghostA;
    GhostSeries internal ghostB;

    uint64 public immutable tradingStart;
    uint64 public immutable exerciseStart;
    uint64 public immutable exerciseEnd;

    uint256 public ghostCalls;

    constructor(
        SeriesFactory factory_,
        SeriesVault vaultA_,
        SeriesVault vaultB_,
        bytes32 seriesA_,
        bytes32 seriesB_,
        MockERC20 usdc_,
        MockERC20 eurc_,
        uint64 tradingStart_,
        uint64 exerciseStart_,
        uint64 exerciseEnd_,
        uint16 feeBps,
        uint256 strike
    ) {
        factory = factory_;
        vaultA = vaultA_;
        vaultB = vaultB_;
        seriesA = seriesA_;
        seriesB = seriesB_;
        usdc = usdc_;
        eurc = eurc_;
        tradingStart = tradingStart_;
        exerciseStart = exerciseStart_;
        exerciseEnd = exerciseEnd_;

        ghostA.strikePerUnit6 = strike;
        ghostA.maxWriterUnits = 1e12;
        ghostA.feeBps = feeBps;
        ghostB.strikePerUnit6 = strike;
        ghostB.maxWriterUnits = 1e12;
        ghostB.feeBps = feeBps;

        actors.push(makeAddr("actor0"));
        actors.push(makeAddr("actor1"));
        actors.push(makeAddr("actor2"));
        actors.push(makeAddr("actor3"));

        for (uint256 i; i < actors.length; i++) {
            usdc.mint(actors[i], 50_000_000e6);
            eurc.mint(actors[i], 50_000_000e6);
            vm.startPrank(actors[i]);
            usdc.approve(address(vaultA), type(uint256).max);
            usdc.approve(address(vaultB), type(uint256).max);
            eurc.approve(address(vaultA), type(uint256).max);
            eurc.approve(address(vaultB), type(uint256).max);
            vm.stopPrank();
        }
    }

    // ─── ghost getters for invariants ───
    function ghostAWriter() external view returns (uint256) {
        return ghostA.writerUnits;
    }

    function ghostAExercised() external view returns (uint256) {
        return ghostA.exercisedUnits;
    }

    function ghostARedeemed() external view returns (uint256) {
        return ghostA.redeemedUnits;
    }

    function ghostAUsdc() external view returns (uint256) {
        return ghostA.accountedUsdc6;
    }

    function ghostAEurc() external view returns (uint256) {
        return ghostA.accountedEurc6;
    }

    function ghostAFee() external view returns (uint256) {
        return ghostA.feePaid6;
    }

    function ghostAFinalized() external view returns (bool) {
        return ghostA.finalized;
    }

    function ghostASnapW() external view returns (uint256) {
        return ghostA.snapshotW0;
    }

    function ghostASnapU() external view returns (uint256) {
        return ghostA.snapshotU0;
    }

    function ghostASnapE() external view returns (uint256) {
        return ghostA.snapshotE0;
    }

    function ghostBWriter() external view returns (uint256) {
        return ghostB.writerUnits;
    }

    function ghostBExercised() external view returns (uint256) {
        return ghostB.exercisedUnits;
    }

    function ghostBRedeemed() external view returns (uint256) {
        return ghostB.redeemedUnits;
    }

    function ghostBUsdc() external view returns (uint256) {
        return ghostB.accountedUsdc6;
    }

    function ghostBEurc() external view returns (uint256) {
        return ghostB.accountedEurc6;
    }

    function ghostBFee() external view returns (uint256) {
        return ghostB.feePaid6;
    }

    function ghostBFinalized() external view returns (bool) {
        return ghostB.finalized;
    }

    function ghostBSnapW() external view returns (uint256) {
        return ghostB.snapshotW0;
    }

    function ghostBSnapU() external view returns (uint256) {
        return ghostB.snapshotU0;
    }

    function ghostBSnapE() external view returns (uint256) {
        return ghostB.snapshotE0;
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    function _pick(uint256 which) internal view returns (SeriesVault v, GhostSeries storage g) {
        if (which % 2 == 0) {
            return (vaultA, ghostA);
        }
        return (vaultB, ghostB);
    }

    function warpRelative(uint256 seed) external {
        uint256 bucket = seed % 4;
        if (bucket == 0) vm.warp(tradingStart);
        else if (bucket == 1) vm.warp(tradingStart + 1 + (seed % (exerciseStart - tradingStart - 1)));
        else if (bucket == 2) vm.warp(exerciseStart + (seed % (exerciseEnd - exerciseStart)));
        else vm.warp(exerciseEnd + (seed % 1000));
        ghostCalls++;
    }

    function mint(uint256 actorSeed, uint256 which, uint256 qRaw) external {
        (SeriesVault v, GhostSeries storage g) = _pick(which);
        address actor = _actor(actorSeed);
        uint256 q = bound(qRaw, 1, 100_000);
        if (v.phase() != 1 || v.newRiskPaused()) return;
        if (v.writerUnits() + q > v.maxWriterUnits()) return;
        uint256 collateral = q * v.strikePerUnit6();
        uint256 fee =
            (v.issuanceFeeBps() == 0) ? 0 : (collateral * uint256(v.issuanceFeeBps()) + 9999) / 10000;
        if (usdc.balanceOf(actor) < collateral + fee) return;

        vm.prank(actor);
        try v.mint(q) {
            g.mint(q);
            ghostCalls++;
        } catch {}
    }

    function cancel(uint256 actorSeed, uint256 which, uint256 qRaw) external {
        (SeriesVault v, GhostSeries storage g) = _pick(which);
        address actor = _actor(actorSeed);
        if (v.phase() != 1 || v.exercisedUnits() != 0) return;
        uint256 matched = v.longToken().balanceOf(actor);
        uint256 receipt = v.writerReceipt().balanceOf(actor);
        if (receipt < matched) matched = receipt;
        if (matched == 0) return;
        uint256 q = bound(qRaw, 1, matched);

        vm.prank(actor);
        try v.cancel(q) {
            g.cancel(q);
            ghostCalls++;
        } catch {}
    }

    function transferLong(uint256 fromSeed, uint256 toSeed, uint256 which, uint256 qRaw) external {
        (SeriesVault v,) = _pick(which);
        address from = _actor(fromSeed);
        address to = _actor(toSeed);
        if (from == to) return;
        uint256 bal = v.longToken().balanceOf(from);
        if (bal == 0) return;
        uint256 q = bound(qRaw, 1, bal);
        vm.prank(from);
        try v.longToken().transfer(to, q) {
            ghostCalls++;
        } catch {}
    }

    function transferReceipt(uint256 fromSeed, uint256 toSeed, uint256 which, uint256 qRaw) external {
        (SeriesVault v,) = _pick(which);
        address from = _actor(fromSeed);
        address to = _actor(toSeed);
        if (from == to) return;
        uint256 bal = v.writerReceipt().balanceOf(from);
        if (bal == 0) return;
        uint256 q = bound(qRaw, 1, bal);
        vm.prank(from);
        try v.writerReceipt().transfer(to, q) {
            ghostCalls++;
        } catch {}
    }

    function exercise(uint256 actorSeed, uint256 which, uint256 qRaw) external {
        (SeriesVault v, GhostSeries storage g) = _pick(which);
        address actor = _actor(actorSeed);
        if (v.phase() != 2) return;
        uint256 bal = v.longToken().balanceOf(actor);
        if (bal == 0) return;
        uint256 q = bound(qRaw, 1, bal);
        if (eurc.balanceOf(actor) < q * 100) return;

        vm.prank(actor);
        try v.exercise(q) {
            g.exercise(q);
            ghostCalls++;
        } catch {}
    }

    function redeem(uint256 actorSeed, uint256 which, uint256 qRaw) external {
        (SeriesVault v, GhostSeries storage g) = _pick(which);
        address actor = _actor(actorSeed);
        if (v.phase() != 3) return;
        uint256 bal = v.writerReceipt().balanceOf(actor);
        if (bal == 0) return;
        uint256 q = bound(qRaw, 1, bal);

        vm.prank(actor);
        try v.redeem(q) {
            g.redeem(q);
            ghostCalls++;
        } catch {}
    }

    function donate(uint256 which, uint256 amountRaw, bool isUsdc) external {
        (SeriesVault v, GhostSeries storage g) = _pick(which);
        uint256 amount = bound(amountRaw, 1, 1_000_000e6);
        address donor = address(uint160(uint256(keccak256(abi.encode("donor", amountRaw, which)))));
        if (isUsdc) {
            usdc.mint(donor, amount);
            vm.prank(donor);
            usdc.transfer(address(v), amount);
        } else {
            eurc.mint(donor, amount);
            vm.prank(donor);
            eurc.transfer(address(v), amount);
        }
        g.noteDonation(isUsdc, amount);
        ghostCalls++;
    }

    function setPause(uint256 which, bool paused) external {
        bytes32 sid = which % 2 == 0 ? seriesA : seriesB;
        factory.setNewRiskPaused(sid, paused);
        ghostCalls++;
    }
}
