// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SimulateMultiWalletLifecycle} from "../script/SimulateMultiWalletLifecycle.s.sol";
import {InvoiceManagerV2} from "../src/InvoiceManagerV2.sol";
import {TuckerBuilderToken} from "../src/TuckerBuilderToken.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract SimulateMultiWalletLifecycleTest is Test {
    SimulateMultiWalletLifecycle internal script;
    InvoiceManagerV2 internal manager;
    TuckerBuilderToken internal tbt;
    MockUSDC internal usdc;
    address internal defaultBroadcaster = 0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38;

    function setUp() public {
        script = new SimulateMultiWalletLifecycle();

        tbt = new TuckerBuilderToken();
        usdc = new MockUSDC();

        tbt.transfer(defaultBroadcaster, 100 ether);
        usdc.transfer(defaultBroadcaster, 1000 * 10 ** 6);

        address[] memory tokens = new address[](2);
        tokens[0] = address(tbt);
        tokens[1] = address(usdc);

        manager = new InvoiceManagerV2(defaultBroadcaster, tokens);

        vm.setEnv("INVOICE_MANAGER_V2_ADDRESS", vm.toString(address(manager)));
        vm.setEnv("TBT_ADDRESS", vm.toString(address(tbt)));
        vm.setEnv("USDC_ADDRESS", vm.toString(address(usdc)));
    }

    function tearDown() public {
        vm.setEnv("INVOICE_MANAGER_V2_ADDRESS", vm.toString(address(0xB4f7A4dA6eD75033E25231bd43D9A207797391f6)));
        vm.setEnv("TBT_ADDRESS", vm.toString(address(0x326b07d3e36c1Aa6213368E5e1AaDa29f2CB4BE5)));
        vm.setEnv("USDC_ADDRESS", vm.toString(address(0x91a487BfAC67b3CF39F51425f762510dCb196026)));
    }

    function test_RunSimulatesMultiWalletLifecycle() public {
        script.run();

        // 6 invoices created:
        // 0: TBT settled
        // 1: TBT cancelled
        // 2: USDC settled
        // 3: USDC open (Agency C)
        // 4: USDC open (Client D)
        // 5: TBT open (Pilot B)
        assertEq(manager.nextInvoiceId(), 6);

        (,,,,,, InvoiceManagerV2.InvoiceStatus status0) = manager.invoices(0);
        assertEq(uint8(status0), uint8(InvoiceManagerV2.InvoiceStatus.Paid));

        (,,,,,, InvoiceManagerV2.InvoiceStatus status1) = manager.invoices(1);
        assertEq(uint8(status1), uint8(InvoiceManagerV2.InvoiceStatus.Cancelled));

        // Invoice 2: TBT open for Wallet B
        (,,,,,, InvoiceManagerV2.InvoiceStatus status2) = manager.invoices(2);
        assertEq(uint8(status2), uint8(InvoiceManagerV2.InvoiceStatus.Open));

        // Invoice 3: USDC settled
        (,,,,,, InvoiceManagerV2.InvoiceStatus status3) = manager.invoices(3);
        assertEq(uint8(status3), uint8(InvoiceManagerV2.InvoiceStatus.Paid));

        // Invoice 4: USDC open for Agency C
        (,,,,,, InvoiceManagerV2.InvoiceStatus status4) = manager.invoices(4);
        assertEq(uint8(status4), uint8(InvoiceManagerV2.InvoiceStatus.Open));
    }
}
