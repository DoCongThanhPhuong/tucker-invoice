// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DeployInvoiceManager} from "../script/DeployInvoiceManager.s.sol";
import {InvoiceManager} from "../src/InvoiceManager.sol";

contract DeployInvoiceManagerTest is Test {
    address internal constant TBT_ADDRESS = address(0x326b07d3e36c1Aa6213368E5e1AaDa29f2CB4BE5);

    function test_RunValidatesTokenAndDeploysWithConfiguredToken() public {
        vm.setEnv("TBT_ADDRESS", vm.toString(address(0)));
        DeployInvoiceManager deployer = new DeployInvoiceManager();

        bool reverted;
        try deployer.run() returns (InvoiceManager) {
            fail("deployment should revert");
        } catch Error(string memory reason) {
            assertEq(reason, "TBT_ADDRESS is zero");
            reverted = true;
        }

        assertTrue(reverted);

        vm.setEnv("TBT_ADDRESS", vm.toString(TBT_ADDRESS));
        InvoiceManager deployedInvoiceManager = deployer.run();

        assertTrue(address(deployedInvoiceManager) != address(0));
        assertEq(address(deployer.invoiceManager()), address(deployedInvoiceManager));
        assertEq(address(deployedInvoiceManager.paymentToken()), TBT_ADDRESS);
    }
}
