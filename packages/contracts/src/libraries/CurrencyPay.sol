// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.26;

import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IERC20Minimal} from "@uniswap/v4-core/src/interfaces/external/IERC20Minimal.sol";

/// @dev Minimal settle/take helpers for PairbandRouter (mirrors v4 CurrencySettler).
library CurrencyPay {
    function settle(Currency currency, IPoolManager manager, address payer, uint256 amount) internal {
        if (currency.isAddressZero()) {
            manager.settle{value: amount}();
            return;
        }
        manager.sync(currency);
        if (payer != address(this)) {
            IERC20Minimal(Currency.unwrap(currency)).transferFrom(payer, address(manager), amount);
        } else {
            IERC20Minimal(Currency.unwrap(currency)).transfer(address(manager), amount);
        }
        manager.settle();
    }

    function take(Currency currency, IPoolManager manager, address recipient, uint256 amount) internal {
        manager.take(currency, recipient, amount);
    }
}
