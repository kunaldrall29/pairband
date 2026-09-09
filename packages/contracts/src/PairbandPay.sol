// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/**
 * @title PairbandPay
 * @notice Optional P2 helper: emit an application Receipt after an Arc Memo-wrapped pay.
 * @dev P0 does NOT require this. Prefer Arc Memo.memo(USDC, transfer, memoId, memoData)
 *      which already performs atomic transfer + memo with EOA msg.sender preservation.
 *      This contract must never custody user funds.
 */
contract PairbandPay {
    event Receipt(
        address indexed payer,
        address indexed payee,
        address indexed tokenOut,
        uint256 amountOut,
        bytes32 memoId,
        bytes referenceData
    );

    error ZeroAddress();
    error EmptyReference();

    /// @notice Record an offchain-confirmed payout for indexers. Does not move funds.
    function recordReceipt(
        address payee,
        address tokenOut,
        uint256 amountOut,
        bytes32 memoId,
        bytes calldata referenceData
    ) external {
        if (payee == address(0) || tokenOut == address(0)) revert ZeroAddress();
        if (referenceData.length == 0) revert EmptyReference();
        emit Receipt(msg.sender, payee, tokenOut, amountOut, memoId, referenceData);
    }
}
