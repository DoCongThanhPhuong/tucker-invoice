// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SimulateLifecycle} from "../script/SimulateLifecycle.s.sol";
import {InvoiceManagerV2} from "../src/InvoiceManagerV2.sol";
import {TuckerBuilderToken} from "../src/TuckerBuilderToken.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract SimulateLifecycleTest is Test {
    SimulateLifecycle internal script;
    InvoiceManagerV2 internal manager;
    TuckerBuilderToken internal tbt;
    MockUSDC internal usdc;
    address internal defaultBroadcaster = 0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38;

    function setUp() public {
        script = new SimulateLifecycle();

        tbt = new TuckerBuilderToken();
        usdc = new MockUSDC();

        tbt.transfer(defaultBroadcaster, 50 ether);
        usdc.transfer(defaultBroadcaster, 500 * 10 ** 6);

        address[] memory tokens = new address[](2);
        tokens[0] = address(tbt);
        tokens[1] = address(usdc);

        manager = new InvoiceManagerV2(defaultBroadcaster, tokens);

        vm.setEnv("INVOICE_MANAGER_V2_ADDRESS", vm.toString(address(manager)));
        vm.setEnv("TBT_ADDRESS", vm.toString(address(tbt)));
        vm.setEnv("USDC_ADDRESS", vm.toString(address(usdc)));
    }

    function test_RunSimulatesFullLifecycle() public {
        script.run();

        // 1 settled TBT, 1 cancelled TBT, 3 open TBT, 1 settled USDC, 1 open USDC = 7 invoices
        assertEq(manager.nextInvoiceId(), 7);

        // Check invoice 0 (settled TBT)
        (,,,,,, InvoiceManagerV2.InvoiceStatus status0) = manager.invoices(0);
        assertEq(uint8(status0), uint8(InvoiceManagerV2.InvoiceStatus.Paid));

        // Check invoice 1 (cancelled TBT)
        (,,,,,, InvoiceManagerV2.InvoiceStatus status1) = manager.invoices(1);
        assertEq(uint8(status1), uint8(InvoiceManagerV2.InvoiceStatus.Cancelled));

        // Check invoice 5 (settled USDC)
        (,,,,,, InvoiceManagerV2.InvoiceStatus status5) = manager.invoices(5);
        assertEq(uint8(status5), uint8(InvoiceManagerV2.InvoiceStatus.Paid));
    }
}
