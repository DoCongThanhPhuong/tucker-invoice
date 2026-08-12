// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DeployInvoiceManagerV2} from "../script/DeployInvoiceManagerV2.s.sol";
import {InvoiceManagerV2} from "../src/InvoiceManagerV2.sol";
import {MockERC20Decimals} from "./mocks/MockERC20Decimals.sol";

contract DeployInvoiceManagerV2Test is Test {
    address internal constant OWNER = address(0x0000000000000000000000000000000000000001);

    function test_RunValidatesOwnerAndDeploysWithConfiguredTokens() public {
        MockERC20Decimals paymentToken = new MockERC20Decimals("Test USD", "TUSD", 6);
        address paymentTokenAddress = address(paymentToken);
        vm.setEnv("V2_OWNER", vm.toString(address(0)));
        vm.setEnv("V2_PAYMENT_TOKEN", vm.toString(paymentTokenAddress));
        DeployInvoiceManagerV2 deployer = new DeployInvoiceManagerV2();

        bool reverted;
        try deployer.run() returns (InvoiceManagerV2) {
            fail("deployment should revert");
        } catch Error(string memory reason) {
            assertEq(reason, "V2_OWNER is zero or missing");
            reverted = true;
        }
        assertTrue(reverted);

        vm.setEnv("V2_OWNER", vm.toString(OWNER));
        vm.setEnv("V2_PAYMENT_TOKEN", vm.toString(address(0)));

        reverted = false;
        try deployer.run() returns (InvoiceManagerV2) {
            fail("deployment should revert");
        } catch Error(string memory reason) {
            assertEq(reason, "V2 payment token address is zero or missing");
            reverted = true;
        }
        assertTrue(reverted);

        vm.setEnv("V2_OWNER", vm.toString(OWNER));
        vm.setEnv("V2_PAYMENT_TOKEN", vm.toString(paymentTokenAddress));
        InvoiceManagerV2 deployed = deployer.run();

        assertTrue(address(deployed) != address(0));
        assertEq(address(deployer.invoiceManagerV2()), address(deployed));
        assertEq(deployed.owner(), OWNER);
        assertTrue(deployed.supportedPaymentTokens(paymentTokenAddress));
    }
}
