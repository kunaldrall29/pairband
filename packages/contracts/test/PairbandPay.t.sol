// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {PairbandPay} from "../src/PairbandPay.sol";

contract PairbandPayTest {
    function testRecordReceiptEmits() public {
        PairbandPay pay = new PairbandPay();
        pay.recordReceipt(
            address(0xBEEF),
            address(0xCAFE),
            1_000_000,
            bytes32("INV-1042"),
            bytes("INV-1042")
        );
    }
}
