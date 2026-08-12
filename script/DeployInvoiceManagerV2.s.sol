// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {InvoiceManagerV2} from "../src/InvoiceManagerV2.sol";

contract DeployInvoiceManagerV2 is Script {
    InvoiceManagerV2 public invoiceManagerV2;

    function run() external returns (InvoiceManagerV2 deployedInvoiceManagerV2) {
        address initialOwner = vm.envOr("V2_OWNER", address(0));
        require(initialOwner != address(0), "V2_OWNER is zero or missing");

        address defaultToken = vm.envOr("TBT_ADDRESS", address(0));
        address allowedToken = vm.envOr("V2_PAYMENT_TOKEN", defaultToken);
        require(allowedToken != address(0), "V2 payment token address is zero or missing");

        address[] memory initialTokens = new address[](1);
        initialTokens[0] = allowedToken;

        vm.startBroadcast();

        deployedInvoiceManagerV2 = new InvoiceManagerV2(initialOwner, initialTokens);
        invoiceManagerV2 = deployedInvoiceManagerV2;

        vm.stopBroadcast();
    }
}
