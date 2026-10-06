// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {InvoiceManagerV2} from "../src/InvoiceManagerV2.sol";

contract SimulateActivity is Script {
    function run() external {
        address v2Address = vm.envOr("INVOICE_MANAGER_V2_ADDRESS", address(0xB4f7A4dA6eD75033E25231bd43D9A207797391f6));
        address defaultToken = vm.envOr("TBT_ADDRESS", address(0x326b07d3e36c1Aa6213368E5e1AaDa29f2CB4BE5));
        address tokenAddress = vm.envOr("ACTIVITY_TOKEN_ADDRESS", defaultToken);
        address payer = vm.envOr("ACTIVITY_PAYER", msg.sender);
        uint256 count = vm.envOr("ACTIVITY_COUNT", uint256(1));
        uint256 amount = vm.envOr("ACTIVITY_AMOUNT", uint256(1 ether));

        InvoiceManagerV2 manager = InvoiceManagerV2(v2Address);

        vm.startBroadcast();
        for (uint256 i = 0; i < count; i++) {
            bytes32 refHash = keccak256(abi.encodePacked("TX-ACTIVITY-", block.timestamp, i));
            manager.createInvoice(payer, tokenAddress, amount, uint64(block.timestamp + 7 days), refHash);
        }
        vm.stopBroadcast();
    }
}
