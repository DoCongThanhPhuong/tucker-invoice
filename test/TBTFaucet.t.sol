// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {TBTFaucet} from "../src/TBTFaucet.sol";
import {TuckerBuilderToken} from "../src/TuckerBuilderToken.sol";

contract TBTFaucetTest is Test {
    TuckerBuilderToken public token;
    TBTFaucet public faucet;

    address public user1 = address(0x111);
    address public user2 = address(0x222);

    function setUp() public {
        token = new TuckerBuilderToken();
        faucet = new TBTFaucet(address(token));

        // Fund faucet with 10,000 TBT
        token.transfer(address(faucet), 10_000 ether);
    }

    function test_Claim_TransfersExactFaucetAmount() public {
        vm.prank(user1);
        faucet.claim();

        assertEq(token.balanceOf(user1), 100 ether);
        assertEq(faucet.lastClaimTime(user1), block.timestamp);
    }

    function test_Claim_RevertsWhenCooldownActive() public {
        vm.prank(user1);
        faucet.claim();

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(TBTFaucet.CooldownActive.selector, block.timestamp + 1 days));
        faucet.claim();
    }

    function test_Claim_SucceedsAfterCooldownExpires() public {
        vm.prank(user1);
        faucet.claim();

        // Warp 1 day + 1 second
        vm.warp(block.timestamp + 1 days + 1);

        vm.prank(user1);
        faucet.claim();

        assertEq(token.balanceOf(user1), 200 ether);
    }

    function test_Claim_RevertsWhenFaucetBalanceInsufficient() public {
        TBTFaucet emptyFaucet = new TBTFaucet(address(token));

        vm.prank(user1);
        vm.expectRevert(TBTFaucet.InsufficientFaucetBalance.selector);
        emptyFaucet.claim();
    }

    function test_Claim_AllowsDifferentUsersConcurrently() public {
        vm.prank(user1);
        faucet.claim();

        vm.prank(user2);
        faucet.claim();

        assertEq(token.balanceOf(user1), 100 ether);
        assertEq(token.balanceOf(user2), 100 ether);
    }
}
