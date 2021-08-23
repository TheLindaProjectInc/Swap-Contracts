// SPDX-License-Identifier: MIT

pragma solidity >=0.8.4;
import "./burnattestor.sol";

/// Management contract for a BurnAttestor which can hold extra funds
/// @title  Custodian
/// @dev    this contract is mainly to correct issues in case things have gone horribly wrong.
/// @author SeqSEE
contract Custodian is BurnAttestor {
    uint256 public balance;
    uint256 public minLock;

    /// Deploy a Custodial contract that is also a BurnAttestor
    constructor(uint256 _attestationsRequired)
        BurnAttestor(_attestationsRequired){ }

    /// An owner only method to change the WrappedAsset this VendorRegistry is associated with, use WrappedAsset.setVendorRegistry() to make the required reciprical change on WrappedAsset.
    /// @param _minLock The minimum amount of MRX in satoshi that a manager may lock
    function setMinLock(uint256 _minLock) public isOwner {
        require(_minLock >= 0, "minLock cannot be less than 0");
        minLock = _minLock;
    }

    /// A management only method to add extra funds that can be manually added by a manager to a vendor's allowance
    function lockFunds() public payable isManager {
        require(msg.value >= minLock, "Value less than minLock");
        balance = balance + msg.value;
    }

    /// A management only method to add to a vendor's available MRX balance, this should only be used to correct balances in case something has gone horribly wrong   
    function addAllowance(address recipient, uint256 amount) public isManager {
        require(amount > 0, "Amount cannot be less than 0");
        pendingWithdraws[recipient] = pendingWithdraws[recipient] + amount;
        balance = balance - amount;
    }

    /// A method to withdraw any available unwrapped vendor funds
    function withdraw() public virtual override returns (uint256) {
        require(pendingWithdraws[msg.sender] > 0, "No available balance");
        uint256 amount = super.withdraw();
        return amount;
    }
}
