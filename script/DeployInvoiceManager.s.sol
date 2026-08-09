// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {InvoiceManager} from "../src/InvoiceManager.sol";

contract DeployInvoiceManager is Script {
    InvoiceManager public invoiceManager;

    function run() external returns (InvoiceManager deployedInvoiceManager) {
        address tokenAddress = vm.envAddress("TBT_ADDRESS");
        require(tokenAddress != address(0), "TBT_ADDRESS is zero");

        vm.startBroadcast();

        deployedInvoiceManager = new InvoiceManager(tokenAddress);
        invoiceManager = deployedInvoiceManager;

        vm.stopBroadcast();
    }
}
