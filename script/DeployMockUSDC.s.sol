// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {InvoiceManagerV2} from "../src/InvoiceManagerV2.sol";

contract DeployMockUSDC is Script {
    function run() external returns (MockUSDC usdc) {
        address v2Address = vm.envOr("INVOICE_MANAGER_V2_ADDRESS", address(0xB4f7A4dA6eD75033E25231bd43D9A207797391f6));

        vm.startBroadcast();
        usdc = new MockUSDC();

        if (v2Address != address(0) && v2Address.code.length > 0) {
            InvoiceManagerV2(v2Address).setPaymentTokenSupport(address(usdc), true);
        }
        vm.stopBroadcast();
    }
}
