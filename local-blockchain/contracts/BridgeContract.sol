/**
 *Submitted for verification at BscScan.com on 2024-06-01
*/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract BridgeContract {
    address public admin;
    IERC20 public token;

    event Bridged(address indexed user, uint256 amount, string destination);
    event Withdrawn(address indexed admin, uint256 amount);

    constructor(address _token) {
        admin = msg.sender;
        token = IERC20(_token);
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    function bridge(uint256 amount, string memory destination) external {
        require(amount > 0, "Amount must be greater than zero");
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit Bridged(msg.sender, amount, destination);
    }

    function withdraw() external onlyAdmin {
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        require(token.transfer(admin, balance), "Withdrawal failed");
        emit Withdrawn(admin, balance);
    }
}