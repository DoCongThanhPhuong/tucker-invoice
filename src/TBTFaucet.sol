// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TBTFaucet
 * @notice Public testnet faucet dispensing 100 TBT per day to testers on Pharos Atlantic.
 */
contract TBTFaucet {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    uint256 public constant FAUCET_AMOUNT = 100 * 10 ** 18;
    uint256 public constant COOLDOWN = 1 days;

    mapping(address => uint256) public lastClaimTime;

    error CooldownActive(uint256 nextAvailableTimestamp);
    error InsufficientFaucetBalance();

    event Claimed(address indexed recipient, uint256 amount);

    constructor(address _token) {
        token = IERC20(_token);
    }

    function claim() external {
        uint256 lastClaim = lastClaimTime[msg.sender];
        if (lastClaim != 0 && block.timestamp < lastClaim + COOLDOWN) {
            revert CooldownActive(lastClaim + COOLDOWN);
        }

        if (token.balanceOf(address(this)) < FAUCET_AMOUNT) revert InsufficientFaucetBalance();

        lastClaimTime[msg.sender] = block.timestamp;
        emit Claimed(msg.sender, FAUCET_AMOUNT);

        token.safeTransfer(msg.sender, FAUCET_AMOUNT);
    }
}
