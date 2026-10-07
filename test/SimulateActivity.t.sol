// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {InvoiceManagerV2} from "../src/InvoiceManagerV2.sol";
import {TuckerBuilderToken} from "../src/TuckerBuilderToken.sol";
import {SimulateActivity} from "../script/SimulateActivity.s.sol";

contract SimulateActivityTest is Test {
    InvoiceManagerV2 public manager;
    TuckerBuilderToken public token;
    SimulateActivity public activityScript;

    address public owner = address(0xA1);
    address public payer = address(0xB2);

    function setUp() public {
        token = new TuckerBuilderToken();
        address[] memory tokens = new address[](1);
        tokens[0] = address(token);
        manager = new InvoiceManagerV2(owner, tokens);
        activityScript = new SimulateActivity();

        vm.setEnv("INVOICE_MANAGER_V2_ADDRESS", vm.toString(address(manager)));
        vm.setEnv("TBT_ADDRESS", vm.toString(address(token)));
        vm.setEnv("ACTIVITY_TOKEN_ADDRESS", vm.toString(address(token)));
        vm.setEnv("ACTIVITY_PAYER", vm.toString(payer));
        vm.setEnv("ACTIVITY_COUNT", "3");
    }

    function test_RunCreatesSimulatedInvoices() public {
        activityScript.run();
        assertEq(manager.nextInvoiceId(), 3);
        (, address invoicePayer, address paymentToken, uint256 amount,,, InvoiceManagerV2.InvoiceStatus status) =
            manager.invoices(0);
        assertEq(invoicePayer, payer);
        assertEq(paymentToken, address(token));
        assertEq(amount, 1 ether);
        assertEq(uint8(status), 0);
    }
}
