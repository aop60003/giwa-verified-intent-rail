// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IMockIntentToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract MockVault {
    mapping(address => mapping(address => uint256)) private deposits;

    event MockDeposit(address indexed wallet, address indexed asset, uint256 amount);

    error AmountZero();
    error TokenTransferFailed();

    function deposit(address asset, uint256 amount) external {
        if (amount == 0) revert AmountZero();

        bool transferred = IMockIntentToken(asset).transferFrom(msg.sender, address(this), amount);
        if (!transferred) revert TokenTransferFailed();

        deposits[msg.sender][asset] += amount;

        emit MockDeposit(msg.sender, asset, amount);
    }

    function depositBalanceOf(address wallet, address asset) external view returns (uint256) {
        return deposits[wallet][asset];
    }
}
