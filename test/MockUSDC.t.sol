// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract MockUSDCTest is Test {
    MockUSDC internal usdc;
    address internal deployer = address(0xABCD);
    address internal user = address(0xCAFE);

    function setUp() public {
        vm.prank(deployer);
        usdc = new MockUSDC();
    }

    function test_InitialSupplyAndDecimals() public view {
        assertEq(usdc.name(), "Mock USD Coin");
        assertEq(usdc.symbol(), "USDC");
        assertEq(usdc.decimals(), 6);
        assertEq(usdc.totalSupply(), 1_000_000 * 10 ** 6);
        assertEq(usdc.balanceOf(deployer), 1_000_000 * 10 ** 6);
    }

    function test_PublicMint() public {
        assertEq(usdc.balanceOf(user), 0);
        usdc.mint(user, 500 * 10 ** 6);
        assertEq(usdc.balanceOf(user), 500 * 10 ** 6);
    }
}
