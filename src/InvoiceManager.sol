// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract InvoiceManager {
    using SafeERC20 for IERC20;

    enum InvoiceStatus {
        Open,
        Paid
    }

    struct Invoice {
        address merchant;
        address payer;
        uint256 amount;
        InvoiceStatus status;
    }

    IERC20 public immutable paymentToken;

    uint256 public nextInvoiceId;

    mapping(uint256 => Invoice) public invoices;

    event InvoiceCreated(uint256 indexed invoiceId, address indexed merchant, address indexed payer, uint256 amount);

    event InvoicePaid(uint256 indexed invoiceId, address indexed payer, uint256 amount);

    constructor(address tokenAddress) {
        require(tokenAddress != address(0), "invalid token");
        paymentToken = IERC20(tokenAddress);
    }

    function createInvoice(address payer, uint256 amount) external returns (uint256 invoiceId) {
        require(payer != address(0), "invalid payer");
        require(amount > 0, "amount must be > 0");

        invoiceId = nextInvoiceId++;

        invoices[invoiceId] = Invoice({merchant: msg.sender, payer: payer, amount: amount, status: InvoiceStatus.Open});

        emit InvoiceCreated(invoiceId, msg.sender, payer, amount);
    }

    function payInvoice(uint256 invoiceId) external {
        Invoice storage invoice = invoices[invoiceId];

        require(invoice.merchant != address(0), "invoice not found");
        require(invoice.status == InvoiceStatus.Open, "invoice already paid");
        require(msg.sender == invoice.payer, "not invoice payer");

        invoice.status = InvoiceStatus.Paid;

        paymentToken.safeTransferFrom(msg.sender, invoice.merchant, invoice.amount);

        emit InvoicePaid(invoiceId, msg.sender, invoice.amount);
    }
}
