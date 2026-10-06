// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {InvoiceManagerV2} from "../src/InvoiceManagerV2.sol";

contract SimulateLifecycle is Script {
    function run() external {
        address v2Address = vm.envOr("INVOICE_MANAGER_V2_ADDRESS", address(0xB4f7A4dA6eD75033E25231bd43D9A207797391f6));
        address tbtAddress = vm.envOr("TBT_ADDRESS", address(0x326b07d3e36c1Aa6213368E5e1AaDa29f2CB4BE5));
        address usdcAddress = vm.envOr("USDC_ADDRESS", address(0));

        InvoiceManagerV2 manager = InvoiceManagerV2(v2Address);

        vm.startBroadcast();
        address broadcaster = tx.origin;
        address otherPayer = vm.envOr("ACTIVITY_PAYER", address(0x1111111111111111111111111111111111111111));

        // 1. Create and Pay a TBT invoice (Settlement cycle where broadcaster is payer)
        uint256 tbtAmount = 10 ether;
        bytes32 ref1 = keccak256(abi.encodePacked("SETTLED-TBT-", block.timestamp, uint256(1)));
        uint256 id1 = manager.createInvoice(broadcaster, tbtAddress, tbtAmount, uint64(block.timestamp + 1 days), ref1);
        IERC20(tbtAddress).approve(v2Address, tbtAmount);
        manager.payInvoice(id1);

        // 2. Create and Cancel an invoice (Merchant cancellation cycle)
        bytes32 ref2 = keccak256(abi.encodePacked("CANCELLED-TBT-", block.timestamp, uint256(2)));
        uint256 id2 = manager.createInvoice(otherPayer, tbtAddress, 5 ether, uint64(block.timestamp + 2 days), ref2);
        manager.cancelInvoice(id2);

        // 3. Create Open TBT invoices for ongoing volume
        for (uint256 i = 0; i < 3; i++) {
            bytes32 refOpen = keccak256(abi.encodePacked("OPEN-TBT-", block.timestamp, i));
            manager.createInvoice(otherPayer, tbtAddress, (i + 1) * 1 ether, uint64(block.timestamp + 7 days), refOpen);
        }

        // 4. If USDC is configured and supported, create and pay USDC invoice
        if (usdcAddress != address(0) && manager.supportedPaymentTokens(usdcAddress)) {
            uint256 usdcAmount = 50 * 10 ** 6; // 50 USDC
            bytes32 refUsdcPaid = keccak256(abi.encodePacked("SETTLED-USDC-", block.timestamp, uint256(3)));
            uint256 idUsdc = manager.createInvoice(
                broadcaster, usdcAddress, usdcAmount, uint64(block.timestamp + 3 days), refUsdcPaid
            );
            IERC20(usdcAddress).approve(v2Address, usdcAmount);
            manager.payInvoice(idUsdc);

            // Create open USDC invoice
            bytes32 refUsdcOpen = keccak256(abi.encodePacked("OPEN-USDC-", block.timestamp, uint256(4)));
            manager.createInvoice(
                otherPayer, usdcAddress, 100 * 10 ** 6, uint64(block.timestamp + 14 days), refUsdcOpen
            );
        }

        vm.stopBroadcast();
    }
}
