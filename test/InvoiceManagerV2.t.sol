// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {InvoiceManagerV2} from "../src/InvoiceManagerV2.sol";
import {TuckerBuilderToken} from "../src/TuckerBuilderToken.sol";
import {MockERC20Decimals} from "./mocks/MockERC20Decimals.sol";

contract FalseReturnTokenV2 is ERC20 {
    constructor() ERC20("False Return Token V2", "FALSE2") {}

    function transferFrom(address, address, uint256) public pure override returns (bool) {
        return false;
    }
}

contract InvoiceManagerV2Test is Test {
    TuckerBuilderToken internal tbtToken;
    MockERC20Decimals internal usdcToken;
    InvoiceManagerV2 internal invoiceManager;

    address internal constant OWNER = address(0x0000000000000000000000000000000000000001);
    address internal constant MERCHANT = address(0xBEEF);
    address internal constant PAYER = address(0xA11CE);
    address internal constant OTHER = address(0xCAFE);

    uint256 internal constant TBT_AMOUNT = 100 ether;
    uint256 internal constant USDC_AMOUNT = 1_000 * 1e6; // 6 decimals
    uint64 internal constant FUTURE_DUE_DATE = 1_800_000_000; // distant future timestamp
    bytes32 internal constant REF_HASH = keccak256(abi.encodePacked("INV-2026-001"));

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

    function setUp() public {
        vm.warp(10_000); // Set predictable block.timestamp

        tbtToken = new TuckerBuilderToken();
        usdcToken = new MockERC20Decimals("USD Coin", "USDC", 6);

        address[] memory initialTokens = new address[](2);
        initialTokens[0] = address(tbtToken);
        initialTokens[1] = address(usdcToken);

        invoiceManager = new InvoiceManagerV2(OWNER, initialTokens);

        assertTrue(tbtToken.transfer(PAYER, TBT_AMOUNT * 2));
        usdcToken.mint(PAYER, USDC_AMOUNT * 2);
    }

    // --- Constructor Tests ---

    function test_Constructor_RejectsZeroOwner() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(tbtToken);

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0)));
        new InvoiceManagerV2(address(0), tokens);
    }

    function test_Constructor_RejectsZeroToken() public {
        address[] memory tokens = new address[](2);
        tokens[0] = address(tbtToken);
        tokens[1] = address(0);

        vm.expectRevert(InvoiceManagerV2.ZeroAddressToken.selector);
        new InvoiceManagerV2(OWNER, tokens);
    }

    function test_Constructor_RejectsTokenWithoutCode() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(0x999);

        vm.expectRevert(abi.encodeWithSelector(InvoiceManagerV2.PaymentTokenHasNoCode.selector, address(0x999)));
        new InvoiceManagerV2(OWNER, tokens);
    }

    function test_Constructor_SucceedsWithInitialTokens() public view {
        assertTrue(invoiceManager.supportedPaymentTokens(address(tbtToken)));
        assertTrue(invoiceManager.supportedPaymentTokens(address(usdcToken)));
        assertEq(invoiceManager.owner(), OWNER);
    }

    // --- Owner / Allowlist Tests ---

    function test_SetPaymentTokenSupport_OnlyOwner() public {
        address newToken = address(0x999);

        vm.prank(OTHER);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, OTHER));
        invoiceManager.setPaymentTokenSupport(newToken, true);
    }

    function test_SetPaymentTokenSupport_RejectsZeroAddress() public {
        vm.prank(OWNER);
        vm.expectRevert(InvoiceManagerV2.ZeroAddressToken.selector);
        invoiceManager.setPaymentTokenSupport(address(0), true);
    }

    function test_SetPaymentTokenSupport_RejectsTokenWithoutCode() public {
        address nonContractToken = address(0x999);

        vm.prank(OWNER);
        vm.expectRevert(abi.encodeWithSelector(InvoiceManagerV2.PaymentTokenHasNoCode.selector, nonContractToken));
        invoiceManager.setPaymentTokenSupport(nonContractToken, true);
    }

    function test_SetPaymentTokenSupport_AddsAndRemovesToken() public {
        MockERC20Decimals newTokenContract = new MockERC20Decimals("Test Token", "TEST", 18);
        address newToken = address(newTokenContract);

        vm.expectEmit(true, true, false, true, address(invoiceManager));
        emit PaymentTokenSupportUpdated(newToken, true);
        vm.prank(OWNER);
        invoiceManager.setPaymentTokenSupport(newToken, true);
        assertTrue(invoiceManager.supportedPaymentTokens(newToken));

        vm.expectEmit(true, true, false, true, address(invoiceManager));
        emit PaymentTokenSupportUpdated(newToken, false);
        vm.prank(OWNER);
        invoiceManager.setPaymentTokenSupport(newToken, false);
        assertFalse(invoiceManager.supportedPaymentTokens(newToken));
    }

    // --- Invoice Creation Tests ---

    function test_CreateInvoice_Succeeds() public {
        vm.expectEmit(true, true, true, true, address(invoiceManager));
        emit InvoiceCreated(0, MERCHANT, PAYER, address(tbtToken), TBT_AMOUNT, FUTURE_DUE_DATE, REF_HASH);

        vm.prank(MERCHANT);
        uint256 id = invoiceManager.createInvoice(PAYER, address(tbtToken), TBT_AMOUNT, FUTURE_DUE_DATE, REF_HASH);

        assertEq(id, 0);
        assertEq(invoiceManager.nextInvoiceId(), 1);

        (
            address merchant,
            address payer,
            address paymentToken,
            uint256 amount,
            uint64 dueDate,
            bytes32 refHash,
            InvoiceManagerV2.InvoiceStatus status
        ) = invoiceManager.invoices(id);

        assertEq(merchant, MERCHANT);
        assertEq(payer, PAYER);
        assertEq(paymentToken, address(tbtToken));
        assertEq(amount, TBT_AMOUNT);
        assertEq(dueDate, FUTURE_DUE_DATE);
        assertEq(refHash, REF_HASH);
        assertEq(uint256(status), uint256(InvoiceManagerV2.InvoiceStatus.Open));
    }

    function test_CreateInvoice_RejectsZeroPayer() public {
        vm.prank(MERCHANT);
        vm.expectRevert(InvoiceManagerV2.ZeroAddressPayer.selector);
        invoiceManager.createInvoice(address(0), address(tbtToken), TBT_AMOUNT, FUTURE_DUE_DATE, REF_HASH);
    }

    function test_CreateInvoice_RejectsZeroToken() public {
        vm.prank(MERCHANT);
        vm.expectRevert(InvoiceManagerV2.ZeroAddressToken.selector);
        invoiceManager.createInvoice(PAYER, address(0), TBT_AMOUNT, FUTURE_DUE_DATE, REF_HASH);
    }

    function test_CreateInvoice_RejectsUnsupportedToken() public {
        address unallowedToken = address(0xDEAD);

        vm.prank(MERCHANT);
        vm.expectRevert(abi.encodeWithSelector(InvoiceManagerV2.UnsupportedPaymentToken.selector, unallowedToken));
        invoiceManager.createInvoice(PAYER, unallowedToken, TBT_AMOUNT, FUTURE_DUE_DATE, REF_HASH);
    }

    function test_CreateInvoice_RejectsZeroAmount() public {
        vm.prank(MERCHANT);
        vm.expectRevert(InvoiceManagerV2.InvalidAmount.selector);
        invoiceManager.createInvoice(PAYER, address(tbtToken), 0, FUTURE_DUE_DATE, REF_HASH);
    }

    function test_CreateInvoice_RejectsPastDueDate() public {
        uint64 pastDueDate = uint64(block.timestamp - 1);

        vm.prank(MERCHANT);
        vm.expectRevert(
            abi.encodeWithSelector(InvoiceManagerV2.DueDateInPast.selector, pastDueDate, uint64(block.timestamp))
        );
        invoiceManager.createInvoice(PAYER, address(tbtToken), TBT_AMOUNT, pastDueDate, REF_HASH);
    }

    function test_CreateInvoice_RejectsCurrentTimestampDueDate() public {
        uint64 currentDueDate = uint64(block.timestamp);

        vm.prank(MERCHANT);
        vm.expectRevert(
            abi.encodeWithSelector(InvoiceManagerV2.DueDateInPast.selector, currentDueDate, uint64(block.timestamp))
        );
        invoiceManager.createInvoice(PAYER, address(tbtToken), TBT_AMOUNT, currentDueDate, REF_HASH);
    }

    // --- Pay Invoice Tests ---

    function test_PayInvoice_Succeeds() public {
        uint256 invoiceId = _createInvoice(PAYER, address(tbtToken), TBT_AMOUNT, FUTURE_DUE_DATE);

        vm.prank(PAYER);
        tbtToken.approve(address(invoiceManager), TBT_AMOUNT);

        vm.expectEmit(true, true, false, true, address(invoiceManager));
        emit InvoicePaid(invoiceId, PAYER, address(tbtToken), TBT_AMOUNT, uint64(block.timestamp));

        vm.prank(PAYER);
        invoiceManager.payInvoice(invoiceId);

        (,,,,,, InvoiceManagerV2.InvoiceStatus status) = invoiceManager.invoices(invoiceId);
        assertEq(uint256(status), uint256(InvoiceManagerV2.InvoiceStatus.Paid));
        assertEq(tbtToken.balanceOf(MERCHANT), TBT_AMOUNT);
    }

    function test_PayInvoice_Non18DecimalsSucceeds() public {
        uint256 invoiceId = _createInvoice(PAYER, address(usdcToken), USDC_AMOUNT, FUTURE_DUE_DATE);

        vm.prank(PAYER);
        usdcToken.approve(address(invoiceManager), USDC_AMOUNT);

        vm.prank(PAYER);
        invoiceManager.payInvoice(invoiceId);

        (,,,,,, InvoiceManagerV2.InvoiceStatus status) = invoiceManager.invoices(invoiceId);
        assertEq(uint256(status), uint256(InvoiceManagerV2.InvoiceStatus.Paid));
        assertEq(usdcToken.balanceOf(MERCHANT), USDC_AMOUNT);
    }

    function test_PayInvoice_RejectsNonexistentInvoice() public {
        vm.prank(PAYER);
        vm.expectRevert(abi.encodeWithSelector(InvoiceManagerV2.InvoiceNotFound.selector, 999));
        invoiceManager.payInvoice(999);
    }

    function test_PayInvoice_RejectsUnauthorizedPayer() public {
        uint256 invoiceId = _createInvoice(PAYER, address(tbtToken), TBT_AMOUNT, FUTURE_DUE_DATE);

        vm.prank(OTHER);
        vm.expectRevert(abi.encodeWithSelector(InvoiceManagerV2.UnauthorizedPayer.selector, OTHER, PAYER));
        invoiceManager.payInvoice(invoiceId);
    }

    function test_PayInvoice_RejectsDoublePayment() public {
        uint256 invoiceId = _createInvoice(PAYER, address(tbtToken), TBT_AMOUNT, FUTURE_DUE_DATE);

        vm.prank(PAYER);
        tbtToken.approve(address(invoiceManager), TBT_AMOUNT * 2);
        vm.prank(PAYER);
        invoiceManager.payInvoice(invoiceId);

        vm.prank(PAYER);
        vm.expectRevert(
            abi.encodeWithSelector(
                InvoiceManagerV2.InvoiceNotOpen.selector, invoiceId, InvoiceManagerV2.InvoiceStatus.Paid
            )
        );
        invoiceManager.payInvoice(invoiceId);
    }

    function test_PayInvoice_RejectsPaymentAfterExpiry() public {
        uint64 dueDate = uint64(block.timestamp + 100);
        uint256 invoiceId = _createInvoice(PAYER, address(tbtToken), TBT_AMOUNT, dueDate);

        vm.warp(dueDate + 1);

        vm.prank(PAYER);
        tbtToken.approve(address(invoiceManager), TBT_AMOUNT);

        vm.prank(PAYER);
        vm.expectRevert(
            abi.encodeWithSelector(InvoiceManagerV2.InvoiceExpired.selector, dueDate, uint64(block.timestamp))
        );
        invoiceManager.payInvoice(invoiceId);

        _assertInvoiceOpen(invoiceId);
    }

    function test_PayInvoice_RejectsPaymentAfterCancellation() public {
        uint256 invoiceId = _createInvoice(PAYER, address(tbtToken), TBT_AMOUNT, FUTURE_DUE_DATE);

        vm.prank(MERCHANT);
        invoiceManager.cancelInvoice(invoiceId);

        vm.prank(PAYER);
        tbtToken.approve(address(invoiceManager), TBT_AMOUNT);

        vm.prank(PAYER);
        vm.expectRevert(
            abi.encodeWithSelector(
                InvoiceManagerV2.InvoiceNotOpen.selector, invoiceId, InvoiceManagerV2.InvoiceStatus.Cancelled
            )
        );
        invoiceManager.payInvoice(invoiceId);
    }

    function test_PayInvoice_RejectsInsufficientAllowanceAndRemainsOpen() public {
        uint256 invoiceId = _createInvoice(PAYER, address(tbtToken), TBT_AMOUNT, FUTURE_DUE_DATE);

        vm.prank(PAYER);
        vm.expectRevert();
        invoiceManager.payInvoice(invoiceId);

        _assertInvoiceOpen(invoiceId);
        assertEq(tbtToken.balanceOf(MERCHANT), 0);
    }

    function test_PayInvoice_RejectsInsufficientBalanceAndRemainsOpen() public {
        uint256 invoiceId = _createInvoice(PAYER, address(tbtToken), TBT_AMOUNT * 10, FUTURE_DUE_DATE);

        vm.prank(PAYER);
        tbtToken.approve(address(invoiceManager), TBT_AMOUNT * 10);

        vm.prank(PAYER);
        vm.expectRevert();
        invoiceManager.payInvoice(invoiceId);

        _assertInvoiceOpen(invoiceId);
        assertEq(tbtToken.balanceOf(MERCHANT), 0);
    }

    function test_PayInvoice_FalseReturnRevertsAndRemainsOpen() public {
        FalseReturnTokenV2 falseToken = new FalseReturnTokenV2();
        address[] memory tokens = new address[](1);
        tokens[0] = address(falseToken);

        InvoiceManagerV2 falseManager = new InvoiceManagerV2(OWNER, tokens);

        vm.prank(MERCHANT);
        uint256 invoiceId =
            falseManager.createInvoice(PAYER, address(falseToken), TBT_AMOUNT, FUTURE_DUE_DATE, REF_HASH);

        vm.prank(PAYER);
        vm.expectRevert(
            abi.encodeWithSelector(SafeERC20.SafeERC20FailedOperation.selector, IERC20(address(falseToken)))
        );
        falseManager.payInvoice(invoiceId);

        (,,,,,, InvoiceManagerV2.InvoiceStatus status) = falseManager.invoices(invoiceId);
        assertEq(uint256(status), uint256(InvoiceManagerV2.InvoiceStatus.Open));
    }

    // --- Cancel Invoice Tests ---

    function test_CancelInvoice_SucceedsByMerchant() public {
        uint256 invoiceId = _createInvoice(PAYER, address(tbtToken), TBT_AMOUNT, FUTURE_DUE_DATE);

        vm.expectEmit(true, true, false, true, address(invoiceManager));
        emit InvoiceCancelled(invoiceId, MERCHANT, uint64(block.timestamp));

        vm.prank(MERCHANT);
        invoiceManager.cancelInvoice(invoiceId);

        (,,,,,, InvoiceManagerV2.InvoiceStatus status) = invoiceManager.invoices(invoiceId);
        assertEq(uint256(status), uint256(InvoiceManagerV2.InvoiceStatus.Cancelled));
    }

    function test_CancelInvoice_RejectsNonMerchant() public {
        uint256 invoiceId = _createInvoice(PAYER, address(tbtToken), TBT_AMOUNT, FUTURE_DUE_DATE);

        vm.prank(PAYER);
        vm.expectRevert(abi.encodeWithSelector(InvoiceManagerV2.UnauthorizedMerchant.selector, PAYER, MERCHANT));
        invoiceManager.cancelInvoice(invoiceId);
    }

    function test_CancelInvoice_RejectsAlreadyPaidInvoice() public {
        uint256 invoiceId = _createInvoice(PAYER, address(tbtToken), TBT_AMOUNT, FUTURE_DUE_DATE);

        vm.prank(PAYER);
        tbtToken.approve(address(invoiceManager), TBT_AMOUNT);
        vm.prank(PAYER);
        invoiceManager.payInvoice(invoiceId);

        vm.prank(MERCHANT);
        vm.expectRevert(
            abi.encodeWithSelector(
                InvoiceManagerV2.InvoiceNotOpen.selector, invoiceId, InvoiceManagerV2.InvoiceStatus.Paid
            )
        );
        invoiceManager.cancelInvoice(invoiceId);
    }

    function test_CancelInvoice_RejectsAlreadyCancelledInvoice() public {
        uint256 invoiceId = _createInvoice(PAYER, address(tbtToken), TBT_AMOUNT, FUTURE_DUE_DATE);

        vm.prank(MERCHANT);
        invoiceManager.cancelInvoice(invoiceId);

        vm.prank(MERCHANT);
        vm.expectRevert(
            abi.encodeWithSelector(
                InvoiceManagerV2.InvoiceNotOpen.selector, invoiceId, InvoiceManagerV2.InvoiceStatus.Cancelled
            )
        );
        invoiceManager.cancelInvoice(invoiceId);
    }

    // --- Fuzz Tests ---

    function testFuzz_CreateInvoice(address payer, uint256 amount, uint32 relativeDueDate) public {
        vm.assume(payer != address(0));
        vm.assume(amount > 0);
        uint64 dueDate = uint64(block.timestamp) + uint64(relativeDueDate) + 1;

        vm.prank(MERCHANT);
        uint256 id = invoiceManager.createInvoice(payer, address(tbtToken), amount, dueDate, REF_HASH);

        (address m, address p, address t, uint256 a, uint64 d, bytes32 r, InvoiceManagerV2.InvoiceStatus s) =
            invoiceManager.invoices(id);

        assertEq(m, MERCHANT);
        assertEq(p, payer);
        assertEq(t, address(tbtToken));
        assertEq(a, amount);
        assertEq(d, dueDate);
        assertEq(r, REF_HASH);
        assertEq(uint256(s), uint256(InvoiceManagerV2.InvoiceStatus.Open));
    }

    function testFuzz_StateTransitions(bool payNotCancel) public {
        uint256 invoiceId = _createInvoice(PAYER, address(tbtToken), TBT_AMOUNT, FUTURE_DUE_DATE);

        if (payNotCancel) {
            vm.prank(PAYER);
            tbtToken.approve(address(invoiceManager), TBT_AMOUNT);
            vm.prank(PAYER);
            invoiceManager.payInvoice(invoiceId);

            (,,,,,, InvoiceManagerV2.InvoiceStatus status) = invoiceManager.invoices(invoiceId);
            assertEq(uint256(status), uint256(InvoiceManagerV2.InvoiceStatus.Paid));
        } else {
            vm.prank(MERCHANT);
            invoiceManager.cancelInvoice(invoiceId);

            (,,,,,, InvoiceManagerV2.InvoiceStatus status) = invoiceManager.invoices(invoiceId);
            assertEq(uint256(status), uint256(InvoiceManagerV2.InvoiceStatus.Cancelled));
        }
    }

    // --- Invariant Assertions ---

    function test_TerminalStateExclusivity() public {
        uint256 id1 = _createInvoice(PAYER, address(tbtToken), TBT_AMOUNT, FUTURE_DUE_DATE);
        uint256 id2 = _createInvoice(PAYER, address(tbtToken), TBT_AMOUNT, FUTURE_DUE_DATE);

        // id1 -> Paid
        vm.prank(PAYER);
        tbtToken.approve(address(invoiceManager), TBT_AMOUNT);
        vm.prank(PAYER);
        invoiceManager.payInvoice(id1);

        // id2 -> Cancelled
        vm.prank(MERCHANT);
        invoiceManager.cancelInvoice(id2);

        (,,,,,, InvoiceManagerV2.InvoiceStatus s1) = invoiceManager.invoices(id1);
        (,,,,,, InvoiceManagerV2.InvoiceStatus s2) = invoiceManager.invoices(id2);

        assertTrue(s1 == InvoiceManagerV2.InvoiceStatus.Paid && s1 != InvoiceManagerV2.InvoiceStatus.Cancelled);
        assertTrue(s2 == InvoiceManagerV2.InvoiceStatus.Cancelled && s2 != InvoiceManagerV2.InvoiceStatus.Paid);
    }

    // --- Helpers ---

    function _createInvoice(address payerAddress, address tokenAddress, uint256 amount, uint64 dueDate)
        internal
        returns (uint256 invoiceId)
    {
        vm.prank(MERCHANT);
        invoiceId = invoiceManager.createInvoice(payerAddress, tokenAddress, amount, dueDate, REF_HASH);
    }

    function _assertInvoiceOpen(uint256 invoiceId) internal view {
        (,,,,,, InvoiceManagerV2.InvoiceStatus status) = invoiceManager.invoices(invoiceId);
        assertEq(uint256(status), uint256(InvoiceManagerV2.InvoiceStatus.Open));
    }
}
