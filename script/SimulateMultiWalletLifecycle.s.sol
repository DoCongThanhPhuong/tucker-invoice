// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {InvoiceManagerV2} from "../src/InvoiceManagerV2.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract SimulateMultiWalletLifecycle is Script {
    address internal constant WALLET_B = 0xC462FE75675E0fD20B44239B5cA1D00fEf4deC56; // Receiver/Pilot B
    address internal constant WALLET_C = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; // Agency C
    address internal constant WALLET_D = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC; // Client D

    function run() external {
        address v2Address = vm.envOr("INVOICE_MANAGER_V2_ADDRESS", address(0xB4f7A4dA6eD75033E25231bd43D9A207797391f6));
        address tbtAddress = vm.envOr("TBT_ADDRESS", address(0x326b07d3e36c1Aa6213368E5e1AaDa29f2CB4BE5));
        address usdcAddress = vm.envOr("USDC_ADDRESS", address(0x91a487BfAC67b3CF39F51425f762510dCb196026));

        InvoiceManagerV2 manager = InvoiceManagerV2(v2Address);

        vm.startBroadcast();
        address broadcaster = tx.origin;

        // 1. Liquidity distribution
        if (IERC20(tbtAddress).balanceOf(broadcaster) >= 20 ether) {
            IERC20(tbtAddress).transfer(WALLET_B, 20 ether);
        }

        // 2. Mint test MockUSDC
        if (usdcAddress != address(0)) {
            if (IERC20(usdcAddress).balanceOf(broadcaster) < 200 * 10 ** 6) {
                MockUSDC(usdcAddress).mint(broadcaster, 1000 * 10 ** 6);
            }
            MockUSDC(usdcAddress).mint(WALLET_C, 1000 * 10 ** 6);
            MockUSDC(usdcAddress).mint(WALLET_D, 500 * 10 ** 6);
        }

        // 3. TBT lifecycle
        if (IERC20(tbtAddress).balanceOf(broadcaster) >= 15 ether) {
            _executeTbtLifecycle(manager, broadcaster, tbtAddress);
        }

        // 4. USDC lifecycle
        if (usdcAddress != address(0) && manager.supportedPaymentTokens(usdcAddress)) {
            _executeUsdcLifecycle(manager, broadcaster, usdcAddress);
        }

        vm.stopBroadcast();
    }

    function _executeTbtLifecycle(InvoiceManagerV2 manager, address broadcaster, address token) internal {
        // Create & Settle TBT
        bytes32 refPaid = keccak256(abi.encodePacked("MULTI-SETTLED-TBT-", block.timestamp, uint256(1)));
        uint256 idPaid = manager.createInvoice(broadcaster, token, 15 ether, uint64(block.timestamp + 3 days), refPaid);
        IERC20(token).approve(address(manager), 15 ether);
        manager.payInvoice(idPaid);

        // Create & Cancel TBT
        bytes32 refCancel = keccak256(abi.encodePacked("MULTI-CANCEL-TBT-", block.timestamp, uint256(2)));
        uint256 idCancel = manager.createInvoice(WALLET_B, token, 10 ether, uint64(block.timestamp + 2 days), refCancel);
        manager.cancelInvoice(idCancel);

        // Open TBT for Wallet B
        bytes32 refOpen = keccak256(abi.encodePacked("PILOT-B-TBT-", block.timestamp, uint256(3)));
        manager.createInvoice(WALLET_B, token, 5 ether, uint64(block.timestamp + 7 days), refOpen);
    }

    function _executeUsdcLifecycle(InvoiceManagerV2 manager, address broadcaster, address token) internal {
        // Create & Settle USDC
        bytes32 refPaid = keccak256(abi.encodePacked("MULTI-SETTLED-USDC-", block.timestamp, uint256(4)));
        uint256 idPaid =
            manager.createInvoice(broadcaster, token, 150 * 10 ** 6, uint64(block.timestamp + 5 days), refPaid);
        IERC20(token).approve(address(manager), 150 * 10 ** 6);
        manager.payInvoice(idPaid);

        // Open USDC for Wallet C
        bytes32 refOpenC = keccak256(abi.encodePacked("AGENCY-C-USDC-", block.timestamp, uint256(5)));
        manager.createInvoice(WALLET_C, token, 250 * 10 ** 6, uint64(block.timestamp + 10 days), refOpenC);

        // Open USDC for Wallet D
        bytes32 refOpenD = keccak256(abi.encodePacked("CLIENT-D-USDC-", block.timestamp, uint256(6)));
        manager.createInvoice(WALLET_D, token, 75 * 10 ** 6, uint64(block.timestamp + 21 days), refOpenD);
    }
}
