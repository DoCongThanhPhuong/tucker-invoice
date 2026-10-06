// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DeployFaucet} from "../script/DeployFaucet.s.sol";
import {TBTFaucet} from "../src/TBTFaucet.sol";
import {TuckerBuilderToken} from "../src/TuckerBuilderToken.sol";

contract DeployFaucetTest is Test {
    TuckerBuilderToken public token;
    DeployFaucet public deployer;

    address public defaultBroadcaster = 0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38;

    function setUp() public {
        token = new TuckerBuilderToken();
        deployer = new DeployFaucet();

        token.transfer(defaultBroadcaster, 1000 ether);

        vm.setEnv("FAUCET_TOKEN_ADDRESS", vm.toString(address(token)));
        vm.setEnv("INITIAL_FAUCET_FUND", "1000000000000000000000"); // 1000 TBT
    }

    function test_RunDeploysAndFundsFaucet() public {
        TBTFaucet deployed = deployer.run();
        assertTrue(address(deployed) != address(0));
        assertEq(address(deployed.token()), address(token));
        assertEq(token.balanceOf(address(deployed)), 1000 ether);
    }
}
