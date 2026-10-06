// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {TBTFaucet} from "../src/TBTFaucet.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployFaucet is Script {
    TBTFaucet public faucet;

    function run() external returns (TBTFaucet deployedFaucet) {
        address defaultToken = vm.envOr("TBT_ADDRESS", address(0x326b07d3e36c1Aa6213368E5e1AaDa29f2CB4BE5));
        address tokenAddress = vm.envOr("FAUCET_TOKEN_ADDRESS", defaultToken);
        uint256 initialFund = vm.envOr("INITIAL_FAUCET_FUND", uint256(10_000 ether));

        vm.startBroadcast();
        deployedFaucet = new TBTFaucet(tokenAddress);
        faucet = deployedFaucet;

        if (initialFund > 0) {
            IERC20(tokenAddress).transfer(address(deployedFaucet), initialFund);
        }
        vm.stopBroadcast();
    }
}
