// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {InvoiceManager} from "../src/InvoiceManager.sol";
import {TuckerBuilderToken} from "../src/TuckerBuilderToken.sol";

contract FalseReturnToken is ERC20 {
    constructor() ERC20("False Return Token", "FALSE") {}

    function transferFrom(address, address, uint256) public pure override returns (bool) {
        return false;
    }
}

contract InvoiceManagerTest is Test {
    TuckerBuilderToken internal token;
    InvoiceManager internal invoiceManager;

    address internal constant MERCHANT = address(0xBEEF);
    address internal constant PAYER = address(0xA11CE);
    address internal constant OTHER = address(0xCAFE);
    uint256 internal constant INVOICE_AMOUNT = 100 ether;

    event InvoiceCreated(uint256 indexed invoiceId, address indexed merchant, address indexed payer, uint256 amount);
    event InvoicePaid(uint256 indexed invoiceId, address indexed payer, uint256 amount);

    function setUp() public {
        token = new TuckerBuilderToken();
        invoiceManager = new InvoiceManager(address(token));
        assertTrue(token.transfer(PAYER, INVOICE_AMOUNT));
    }

    function test_ConstructorRejectsZeroTokenAddress() public {
        vm.expectRevert("invalid token");
        new InvoiceManager(address(0));
    }

    function test_CreateInvoiceRejectsZeroPayerAddress() public {
        vm.prank(MERCHANT);
        vm.expectRevert("invalid payer");
        invoiceManager.createInvoice(address(0), INVOICE_AMOUNT);
    }

    function test_CreateInvoiceRejectsZeroAmount() public {
        vm.prank(MERCHANT);
        vm.expectRevert("amount must be > 0");
        invoiceManager.createInvoice(PAYER, 0);
    }

    function test_CreateInvoiceSucceeds() public {
        vm.expectEmit(true, true, true, true, address(invoiceManager));
        emit InvoiceCreated(0, MERCHANT, PAYER, INVOICE_AMOUNT);

        vm.prank(MERCHANT);
        uint256 invoiceId = invoiceManager.createInvoice(PAYER, INVOICE_AMOUNT);

        assertEq(invoiceId, 0);
        assertEq(invoiceManager.nextInvoiceId(), 1);

        (address merchant, address payer, uint256 amount, InvoiceManager.InvoiceStatus status) =
            invoiceManager.invoices(invoiceId);
        assertEq(merchant, MERCHANT);
        assertEq(payer, PAYER);
        assertEq(amount, INVOICE_AMOUNT);
        assertEq(uint256(status), uint256(InvoiceManager.InvoiceStatus.Open));
    }

    function test_PayInvoiceRejectsNonexistentInvoice() public {
        vm.prank(PAYER);
        vm.expectRevert("invoice not found");
        invoiceManager.payInvoice(999);
    }

    function test_PayInvoiceRejectsCallerOtherThanPayer() public {
        uint256 invoiceId = _createInvoice(INVOICE_AMOUNT);

        vm.prank(OTHER);
        vm.expectRevert("not invoice payer");
        invoiceManager.payInvoice(invoiceId);
    }

    function test_PayInvoiceRejectsInsufficientAllowanceAndRemainsOpen() public {
        uint256 invoiceId = _createInvoice(INVOICE_AMOUNT);

        vm.prank(PAYER);
        vm.expectRevert();
        invoiceManager.payInvoice(invoiceId);

        _assertInvoiceOpen(invoiceId);
        assertEq(token.balanceOf(PAYER), INVOICE_AMOUNT);
        assertEq(token.balanceOf(MERCHANT), 0);
    }

    function test_PayInvoiceRejectsInsufficientBalanceAndRemainsOpen() public {
        uint256 invoiceId = _createInvoice(INVOICE_AMOUNT + 1);

        vm.prank(PAYER);
        token.approve(address(invoiceManager), INVOICE_AMOUNT + 1);

        vm.prank(PAYER);
        vm.expectRevert();
        invoiceManager.payInvoice(invoiceId);

        _assertInvoiceOpen(invoiceId);
        assertEq(token.balanceOf(PAYER), INVOICE_AMOUNT);
        assertEq(token.balanceOf(MERCHANT), 0);
    }

    function test_PayInvoiceSucceeds() public {
        uint256 invoiceId = _createInvoice(INVOICE_AMOUNT);

        vm.prank(PAYER);
        token.approve(address(invoiceManager), INVOICE_AMOUNT);

        vm.expectEmit(true, true, false, true, address(invoiceManager));
        emit InvoicePaid(invoiceId, PAYER, INVOICE_AMOUNT);

        vm.prank(PAYER);
        invoiceManager.payInvoice(invoiceId);

        (,,, InvoiceManager.InvoiceStatus status) = invoiceManager.invoices(invoiceId);
        assertEq(uint256(status), uint256(InvoiceManager.InvoiceStatus.Paid));
        assertEq(token.balanceOf(PAYER), 0);
        assertEq(token.balanceOf(MERCHANT), INVOICE_AMOUNT);
        assertEq(token.allowance(PAYER, address(invoiceManager)), 0);
    }

    function test_PayInvoiceRejectsDoublePayment() public {
        uint256 invoiceId = _createInvoice(INVOICE_AMOUNT);

        vm.prank(PAYER);
        token.approve(address(invoiceManager), INVOICE_AMOUNT);
        vm.prank(PAYER);
        invoiceManager.payInvoice(invoiceId);

        vm.prank(PAYER);
        vm.expectRevert("invoice already paid");
        invoiceManager.payInvoice(invoiceId);

        assertEq(token.balanceOf(MERCHANT), INVOICE_AMOUNT);
    }

    function test_PayInvoiceFalseReturnRevertsAndRemainsOpen() public {
        FalseReturnToken falseReturnToken = new FalseReturnToken();
        InvoiceManager falseReturnManager = new InvoiceManager(address(falseReturnToken));

        vm.prank(MERCHANT);
        uint256 invoiceId = falseReturnManager.createInvoice(PAYER, INVOICE_AMOUNT);

        vm.prank(PAYER);
        vm.expectRevert(abi.encodeWithSelector(SafeERC20.SafeERC20FailedOperation.selector, IERC20(falseReturnToken)));
        falseReturnManager.payInvoice(invoiceId);

        (,,, InvoiceManager.InvoiceStatus status) = falseReturnManager.invoices(invoiceId);
        assertEq(uint256(status), uint256(InvoiceManager.InvoiceStatus.Open));
    }

    function _createInvoice(uint256 amount) internal returns (uint256 invoiceId) {
        vm.prank(MERCHANT);
        invoiceId = invoiceManager.createInvoice(PAYER, amount);
    }

    function _assertInvoiceOpen(uint256 invoiceId) internal view {
        (,,, InvoiceManager.InvoiceStatus status) = invoiceManager.invoices(invoiceId);
        assertEq(uint256(status), uint256(InvoiceManager.InvoiceStatus.Open));
    }
}
