// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {Constants} from "@uniswap/v4-core/test/utils/Constants.sol";

import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";
import {DeployPermit2} from "permit2/test/utils/DeployPermit2.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {IPositionDescriptor} from "v4-periphery/src/interfaces/IPositionDescriptor.sol";
import {PositionManager} from "v4-periphery/src/PositionManager.sol";
import {IWETH9} from "v4-periphery/src/interfaces/external/IWETH9.sol";
import {Actions} from "v4-periphery/src/libraries/Actions.sol";
import {Planner, Plan} from "v4-periphery/test/shared/Planner.sol";
import {PositionConfig} from "v4-periphery/test/shared/PositionConfig.sol";

import {SeriesFactory} from "../src/SeriesFactory.sol";
import {SeriesVault} from "../src/SeriesVault.sol";
import {ClaimToken} from "../src/ClaimToken.sol";
import {MockERC20} from "./MockERC20.sol";
import {PairbandLifecycleHook} from "../src/hooks/PairbandLifecycleHook.sol";
import {MarketLauncher} from "../src/MarketLauncher.sol";
import {HookMiner} from "../src/libraries/HookMiner.sol";
import {PairbandRouter} from "../src/PairbandRouter.sol";

/// @dev Minimal descriptor so PositionManager can be constructed in Anvil tests.
contract MockPositionDescriptor is IPositionDescriptor {
    IPoolManager public immutable override poolManager;
    address public immutable override wrappedNative;

    constructor(IPoolManager pm, address weth) {
        poolManager = pm;
        wrappedNative = weth;
    }

    function tokenURI(IPositionManager, uint256) external pure override returns (string memory) {
        return "";
    }

    function flipRatio(address, address) external pure override returns (bool) {
        return false;
    }

    function currencyRatioPriority(address) external pure override returns (int256) {
        return 0;
    }

    function nativeCurrencyLabel() external pure override returns (string memory) {
        return "ETH";
    }
}

/// @notice Real Uniswap v4 PositionManager NFT mint / decrease / collect against Pairband hook.
/// @dev Pairband-deployed PoolManager + PositionManager fixtures — not official Uniswap on Arc.
contract PositionManagerE2ETest is Test, DeployPermit2 {
    using PoolIdLibrary for PoolKey;
    using Planner for Plan;

    MockERC20 usdc;
    MockERC20 eurc;
    SeriesFactory factory;
    SeriesVault vault;
    bytes32 seriesId;

    PoolManager manager;
    PairbandLifecycleHook hook;
    MarketLauncher launcher;
    PairbandRouter router;

    IAllowanceTransfer permit2;
    PositionManager lpm;
    IWETH9 weth;

    address writer = address(0xA11CE);
    address buyer = address(0xB0B);
    address maker;
    address feeRecipient = address(0xFEE);

    uint64 tradingStart = 1_000;
    uint64 exerciseStart = 2_000;
    uint64 exerciseEnd = 3_000;
    PoolKey key;
    uint256 tokenId;

    int24 constant TICK_LOWER = -60;
    int24 constant TICK_UPPER = 60;
    uint128 constant LIQ = 1e9;

    function setUp() public {
        maker = makeAddr("maker");
        usdc = new MockERC20("USD Coin", "USDC", 6);
        eurc = new MockERC20("Euro Coin", "EURC", 6);
        factory = new SeriesFactory(address(eurc), address(usdc), address(this));

        (seriesId,) = factory.createSeries(
            SeriesFactory.CreateParams({
                strikePerUnit6: 110,
                tradingStart: tradingStart,
                exerciseStart: exerciseStart,
                exerciseEnd: exerciseEnd,
                maxWriterUnits: 1e12,
                issuanceFeeBps: 0,
                feeRecipient: feeRecipient,
                longName: "PB Long",
                longSymbol: "pbL",
                receiptName: "PB WR",
                receiptSymbol: "pbW"
            })
        );
        vault = SeriesVault(factory.vaultBySeriesId(seriesId));

        manager = new PoolManager(address(this));
        uint160 flags = uint160((1 << 13) | (1 << 11) | (1 << 7));
        (, bytes32 salt) =
            HookMiner.find(address(this), flags, type(PairbandLifecycleHook).creationCode, abi.encode(manager));
        hook = new PairbandLifecycleHook{salt: salt}(IPoolManager(address(manager)));
        launcher = new MarketLauncher(IPoolManager(address(manager)), hook, address(factory), address(this));
        hook.setMarketLauncher(address(launcher));
        router = new PairbandRouter(IPoolManager(address(manager)), hook);

        // Real periphery POSM stack (Permit2 + PositionManager)
        permit2 = IAllowanceTransfer(deployPermit2());
        weth = IWETH9(makeAddr("WETH"));
        vm.etch(address(weth), hex"00"); // non-empty code; native path unused for ERC20 pair
        MockPositionDescriptor descriptor = new MockPositionDescriptor(IPoolManager(address(manager)), address(weth));
        lpm = new PositionManager(
            IPoolManager(address(manager)), permit2, 100_000, IPositionDescriptor(address(descriptor)), weth
        );

        usdc.mint(writer, 200_000_000e6);
        usdc.mint(maker, 200_000_000e6);
        usdc.mint(buyer, 50_000_000e6);
        vm.prank(writer);
        usdc.approve(address(vault), type(uint256).max);

        vm.warp(tradingStart);
        vm.prank(writer);
        vault.mint(80_000_000);

        ClaimToken long = vault.longToken();
        vm.prank(writer);
        long.transfer(maker, 40_000_000);

        _approvePosm(maker, address(long));
        _approvePosm(maker, address(usdc));
        vm.prank(buyer);
        usdc.approve(address(router), type(uint256).max);

        launcher.registerAndInitializeDefault(address(vault), Constants.SQRT_PRICE_1_1);
        key = hook.getPoolKey(hook.poolIdBySeries(seriesId));

        // Mint NFT liquidity via Action planner
        tokenId = lpm.nextTokenId();
        PositionConfig memory cfg = PositionConfig({poolKey: key, tickLower: TICK_LOWER, tickUpper: TICK_UPPER});
        bytes memory mintCall = _mintEncoded(cfg, LIQ, maker);
        vm.prank(maker);
        lpm.modifyLiquidities(mintCall, _deadline());

        assertEq(lpm.ownerOf(tokenId), maker, "NFT owned by maker");
        assertEq(vault.writerReceipt().balanceOf(writer), 80_000_000, "receipt independent of NFT LP");
    }

    function _deadline() internal view returns (uint256) {
        return block.timestamp + 1 hours;
    }

    function _approvePosm(address who, address token) internal {
        vm.startPrank(who);
        IERC20(token).approve(address(permit2), type(uint256).max);
        permit2.approve(token, address(lpm), type(uint160).max, type(uint48).max);
        vm.stopPrank();
    }

    function _mintEncoded(PositionConfig memory cfg, uint256 liquidity, address recipient)
        internal
        pure
        returns (bytes memory)
    {
        Plan memory planner = Planner.init();
        planner.add(
            Actions.MINT_POSITION,
            abi.encode(
                cfg.poolKey,
                cfg.tickLower,
                cfg.tickUpper,
                liquidity,
                type(uint128).max,
                type(uint128).max,
                recipient,
                bytes("")
            )
        );
        return planner.finalizeModifyLiquidityWithClose(cfg.poolKey);
    }

    function _decreaseEncoded(uint256 id, PositionConfig memory cfg, uint256 liquidity)
        internal
        pure
        returns (bytes memory)
    {
        Plan memory planner = Planner.init();
        planner.add(Actions.DECREASE_LIQUIDITY, abi.encode(id, liquidity, uint128(0), uint128(0), bytes("")));
        return planner.finalizeModifyLiquidityWithClose(cfg.poolKey);
    }

    function _collectEncoded(uint256 id, PositionConfig memory cfg) internal pure returns (bytes memory) {
        // Collect = decrease 0 liquidity (fees only)
        Plan memory planner = Planner.init();
        planner.add(Actions.DECREASE_LIQUIDITY, abi.encode(id, uint256(0), uint128(0), uint128(0), bytes("")));
        return planner.finalizeModifyLiquidityWithClose(cfg.poolKey);
    }

    function test_posmMintTradeDecreaseCollect_lifecycle() public {
        uint256 vaultUsdc = vault.accountedUSDC6();

        // Trade against NFT liquidity
        vm.prank(buyer);
        router.buyExactOutput(seriesId, 50_000, 1_000_000e6, block.timestamp + 60);
        assertEq(vault.accountedUSDC6(), vaultUsdc, "POSM/router must not touch vault");
        assertGt(vault.longToken().balanceOf(buyer), 0);

        PositionConfig memory cfg = PositionConfig({poolKey: key, tickLower: TICK_LOWER, tickUpper: TICK_UPPER});

        // Fee collect (zero decrease) still allowed in trading
        vm.prank(maker);
        lpm.modifyLiquidities(_collectEncoded(tokenId, cfg), _deadline());
        assertEq(lpm.ownerOf(tokenId), maker);

        // After cutoff: adds blocked by hook; decrease/collect still succeed
        vm.warp(exerciseStart);
        assertEq(vault.phase(), 2);

        // Attempt increase via mint of more liquidity on same range through INCREASE — blocked by beforeAddLiquidity
        Plan memory addPlan = Planner.init();
        addPlan.add(
            Actions.INCREASE_LIQUIDITY,
            abi.encode(tokenId, uint256(1e8), type(uint128).max, type(uint128).max, bytes(""))
        );
        bytes memory addCall = addPlan.finalizeModifyLiquidityWithClose(key);
        vm.prank(maker);
        // PoolManager wraps hook TradingDisabled as CustomRevert.WrappedError / HookCallFailed
        vm.expectRevert();
        lpm.modifyLiquidities(addCall, _deadline());

        uint256 longBefore = vault.longToken().balanceOf(maker);
        uint256 usdcBefore = usdc.balanceOf(maker);

        vm.prank(maker);
        lpm.modifyLiquidities(_decreaseEncoded(tokenId, cfg, LIQ), _deadline());

        // Maker recovers inventory from NFT exit (option tokens and/or USDC)
        assertGe(vault.longToken().balanceOf(maker) + usdc.balanceOf(maker), longBefore + usdcBefore);
        assertEq(lpm.ownerOf(tokenId), maker, "NFT remains; liquidity removed");
        assertEq(vault.accountedUSDC6(), vaultUsdc);
    }

    function test_unauthorizedNftManagementReverts() public {
        PositionConfig memory cfg = PositionConfig({poolKey: key, tickLower: TICK_LOWER, tickUpper: TICK_UPPER});
        address attacker = makeAddr("attacker");
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(IPositionManager.NotApproved.selector, attacker));
        lpm.modifyLiquidities(_decreaseEncoded(tokenId, cfg, LIQ), _deadline());
    }
}
