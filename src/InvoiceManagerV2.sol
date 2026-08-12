// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title InvoiceManagerV2
 * @notice Pharos RWA & Stablecoin Invoice Incubator MVP.
 * Allows merchants to create, track, settle, and cancel verifiable stablecoin invoices
 * with allowlisted payment tokens, due date expirations, and non-sensitive reference hashes.
 */
contract InvoiceManagerV2 is Ownable {
    using SafeERC20 for IERC20;

    enum InvoiceStatus {
        Open,
        Paid,
        Cancelled
    }

    struct Invoice {
        address merchant;
        address payer;
        address paymentToken;
        uint256 amount;
        uint64 dueDate;
        bytes32 referenceHash;
        InvoiceStatus status;
    }

    uint256 public nextInvoiceId;

    mapping(uint256 => Invoice) public invoices;
    mapping(address => bool) public supportedPaymentTokens;

    // Custom errors
    error ZeroAddressOwner();
    error ZeroAddressPayer();
    error ZeroAddressToken();
    error PaymentTokenHasNoCode(address token);
    error UnsupportedPaymentToken(address token);
    error InvalidAmount();
    error DueDateInPast(uint64 dueDate, uint64 currentTimestamp);
    error InvoiceNotFound(uint256 invoiceId);
    error InvoiceNotOpen(uint256 invoiceId, InvoiceStatus status);
    error UnauthorizedPayer(address caller, address expectedPayer);
    error UnauthorizedMerchant(address caller, address expectedMerchant);
    error InvoiceExpired(uint64 dueDate, uint64 currentTimestamp);

    // Events
    event InvoiceCreated(
        uint256 indexed invoiceId,
        address indexed merchant,
        address indexed payer,
        address paymentToken,
        uint256 amount,
        uint64 dueDate,
        bytes32 referenceHash
    );

    event InvoicePaid(
        uint256 indexed invoiceId, address indexed payer, address paymentToken, uint256 amount, uint64 paidAt
    );

    event InvoiceCancelled(uint256 indexed invoiceId, address indexed merchant, uint64 cancelledAt);

    event PaymentTokenSupportUpdated(address indexed token, bool indexed isSupported);

    constructor(address initialOwner, address[] memory initialTokens) Ownable(initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddressOwner();

        for (uint256 i = 0; i < initialTokens.length; i++) {
            address token = initialTokens[i];
            if (token == address(0)) revert ZeroAddressToken();
            if (token.code.length == 0) revert PaymentTokenHasNoCode(token);
            supportedPaymentTokens[token] = true;
            emit PaymentTokenSupportUpdated(token, true);
        }
    }

    function setPaymentTokenSupport(address token, bool isSupported) external onlyOwner {
        if (token == address(0)) revert ZeroAddressToken();
        if (isSupported && token.code.length == 0) revert PaymentTokenHasNoCode(token);
        supportedPaymentTokens[token] = isSupported;
        emit PaymentTokenSupportUpdated(token, isSupported);
    }

    function createInvoice(address payer, address paymentToken, uint256 amount, uint64 dueDate, bytes32 referenceHash)
        external
        returns (uint256 invoiceId)
    {
        if (payer == address(0)) revert ZeroAddressPayer();
        if (paymentToken == address(0)) revert ZeroAddressToken();
        if (!supportedPaymentTokens[paymentToken]) revert UnsupportedPaymentToken(paymentToken);
        if (amount == 0) revert InvalidAmount();
        if (dueDate <= block.timestamp) revert DueDateInPast(dueDate, uint64(block.timestamp));

        invoiceId = nextInvoiceId++;

        invoices[invoiceId] = Invoice({
            merchant: msg.sender,
            payer: payer,
            paymentToken: paymentToken,
            amount: amount,
            dueDate: dueDate,
            referenceHash: referenceHash,
            status: InvoiceStatus.Open
        });

        emit InvoiceCreated(invoiceId, msg.sender, payer, paymentToken, amount, dueDate, referenceHash);
    }

    function payInvoice(uint256 invoiceId) external {
        Invoice storage invoice = invoices[invoiceId];

        if (invoice.merchant == address(0)) revert InvoiceNotFound(invoiceId);
        if (invoice.status != InvoiceStatus.Open) revert InvoiceNotOpen(invoiceId, invoice.status);
        if (msg.sender != invoice.payer) revert UnauthorizedPayer(msg.sender, invoice.payer);
        if (block.timestamp > invoice.dueDate) revert InvoiceExpired(invoice.dueDate, uint64(block.timestamp));

        // State update BEFORE external call (Checks-Effects-Interactions pattern)
        invoice.status = InvoiceStatus.Paid;

        emit InvoicePaid(invoiceId, msg.sender, invoice.paymentToken, invoice.amount, uint64(block.timestamp));

        IERC20(invoice.paymentToken).safeTransferFrom(msg.sender, invoice.merchant, invoice.amount);
    }

    function cancelInvoice(uint256 invoiceId) external {
        Invoice storage invoice = invoices[invoiceId];

        if (invoice.merchant == address(0)) revert InvoiceNotFound(invoiceId);
        if (invoice.status != InvoiceStatus.Open) revert InvoiceNotOpen(invoiceId, invoice.status);
        if (msg.sender != invoice.merchant) revert UnauthorizedMerchant(msg.sender, invoice.merchant);

        invoice.status = InvoiceStatus.Cancelled;

        emit InvoiceCancelled(invoiceId, msg.sender, uint64(block.timestamp));
    }
}
