// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DeployMockUSDC} from "../script/DeployMockUSDC.s.sol";
import {InvoiceManagerV2} from "../src/InvoiceManagerV2.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract DeployMockUSDCTest is Test {
    DeployMockUSDC internal script;
    InvoiceManagerV2 internal manager;
    address internal defaultBroadcaster = 0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38;

    function setUp() public {
        script = new DeployMockUSDC();
        address[] memory tokens = new address[](0);
        manager = new InvoiceManagerV2(defaultBroadcaster, tokens);
        vm.setEnv("INVOICE_MANAGER_V2_ADDRESS", vm.toString(address(manager)));
    }

    function test_RunDeploysAndAllowsToken() public {
        MockUSDC usdc = script.run();

        assertTrue(address(usdc) != address(0));
        assertTrue(manager.supportedPaymentTokens(address(usdc)));
        assertEq(usdc.decimals(), 6);
    }
}
