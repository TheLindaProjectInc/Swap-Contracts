// SPDX-License-Identifier: MIT

pragma solidity >=0.8.4;

import "./ownable.sol";
import "./managable.sol";

/// Management contract for a BurnAttestor which can hold extra funds
/// @title  BurnAttestor
/// @dev    this contract acts as both a trusted oracle which managers can attest cross chain burns of MRXb/MRXe and also as a ledger for vendor withdraws from unwraps.
/// @author SeqSEE
contract BurnAttestor is Ownable, Managable {

    uint256 public attestationsRequired;
    mapping(uint256 => uint256) public bscAttestations; //burn txid => attested
    mapping(uint256 => uint256) public ethAttestations; //burn txid => attested
    mapping(uint256 => mapping(address => bool)) public bscAttested; //burn txid => mapping (address => attested)
    mapping(uint256 => mapping(address => bool)) public ethAttested; //burn txid => mapping (address => attested)
    mapping(address => uint256) public pendingWithdraws;

    /// Emitted whenever a burn is attested by a manager
    /// @param chain  The chain which the burn occurred, this can only be "bsc" or "eth"
    /// @param burn   The transaction hash of the burn 
    /// @param burner The hexified vendor address
    /// @param value  The amount of the burn
    event BurnAttested(
        string indexed chain,
        bytes32 burn,
        address indexed burner,
        uint256 value
    );

    /// Deploy a BurnAttestor contract
    constructor(uint256 _attestationsRequired) {
        attestationsRequired = _attestationsRequired;
    }

    /// A management only method to attest cross chain burns and once sufficently attested to increase the vendor allowance
    /// @param chain The chain which the burn occurred, this can only be "bsc" or "eth"
    /// @param burn The transaction hash of the burn
    /// @param burner The hexified MRX address which is tied to the vendor
    function attestBurn(
        string memory chain,
        uint256 burn,
        address payable burner
    ) public payable isManager {
        if (
            keccak256(abi.encodePacked(chain)) ==
            keccak256(abi.encodePacked("bsc"))
        ) {
            require(bscAttested[burn][msg.sender] == false, "Already attested");
            bscAttested[burn][msg.sender] = true;
            bscAttestations[burn] = bscAttestations[burn] + 1;
            if (bscAttestations[burn] >= attestationsRequired) {
                pendingWithdraws[payable(burner)] += msg.value;
                emit BurnAttested(chain, bytes32(burn), burner, msg.value);
            }
        } else if (
            keccak256(abi.encodePacked(chain)) ==
            keccak256(abi.encodePacked("eth"))
        ) {
            require(ethAttested[burn][msg.sender] == false, "Already attested");
            ethAttested[burn][msg.sender] = true;
            ethAttestations[burn] = ethAttestations[burn] + 1;
            if (ethAttestations[burn] >= attestationsRequired) {
                pendingWithdraws[payable(burner)] + msg.value;
                emit BurnAttested(chain, bytes32(burn), burner, msg.value);
            }
        } else {
            revert("Unknown chain");
        }
    }

    /// An owner only method to change the amount of attestations required
    /// @param _attestationsRequired The amount of attestations required before a vendor allowance can be increased
    function setAttestationRequired(uint256 _attestationsRequired)
        public
        isOwner
    {
        require(_attestationsRequired > 0, "Amount must be greater than 0");
        attestationsRequired = _attestationsRequired;
    }
    
    /// A method to retrieve the caller's available balance in satoshi
    function vendorBalance() public view returns (uint256) {
        return pendingWithdraws[msg.sender];
    }

    /// A method to withdraw any available unwrapped vendor funds
    function withdraw() public virtual returns (uint256) {
        uint256 amount = pendingWithdraws[msg.sender];
        require(amount > 0, "Insufficient funds");
        // Remember to zero the pending refund before
        // sending to prevent re-entrancy attacks
        pendingWithdraws[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        return amount;
    }
}
