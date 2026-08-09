// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {TuckerBuilderToken} from "../src/TuckerBuilderToken.sol";

contract TuckerBuilderTokenTest is Test {
    TuckerBuilderToken token;

    address alice = address(0xA11CE);

    function setUp() public {
        token = new TuckerBuilderToken();
    }

    function test_NameAndSymbol() public view {
        assertEq(token.name(), "Tucker Builder Token");
        assertEq(token.symbol(), "TBT");
    }

    function test_InitialSupplyBelongsToDeployer() public view {
        uint256 expectedSupply = 1_000_000 * 10 ** token.decimals();

        assertEq(token.totalSupply(), expectedSupply);
        assertEq(token.balanceOf(address(this)), expectedSupply);
    }

    function test_Transfer() public {
        uint256 amount = 100 * 10 ** token.decimals();

        assertTrue(token.transfer(alice, amount));

        assertEq(token.balanceOf(alice), amount);
    }
}
