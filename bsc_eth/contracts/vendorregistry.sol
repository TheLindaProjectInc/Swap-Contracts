// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./pausable.sol";
import "./managable.sol";
import "./wrappedasset.sol";
import "./imigratablevendorregistry.sol";



contract VendorRegistry is Pausable, Managable, IMigratableVendorRegistry
    {
    address                     private wrappedAssetAddr;
    WrappedAsset                private wrappedAsset;
    mapping(address => address) private vendor2mrx;
    mapping(address => address) private mrx2vendor;

    event Registered(address mrxAddress, address vendorAddress);
    event Unregistered(address mrxAddress, address vendorAddress);

    constructor(string memory tokenName, string memory tokenSymbol, uint256 tokenCap, uint256 tokenSnapshotIntervalHours)
        {
        wrappedAsset = new WrappedAsset(tokenName, tokenSymbol, tokenCap, tokenSnapshotIntervalHours);
        wrappedAssetAddr = address(wrappedAsset);
        wrappedAsset.setVendorRegistry(address(this));
        wrappedAsset.changeOwner(getOwner());
        }

    function pairWithWrappedAsset(address WrappedAssetAddress) public isOwner
        {
        wrappedAssetAddr = WrappedAssetAddress;
        wrappedAsset = WrappedAsset(WrappedAssetAddress);
        wrappedAsset.setVendorRegistry(address(this));
        }

    function findVendorFromMrx(address mrxAddress) public view returns (address)
        {
        return mrx2vendor[mrxAddress];
        }

    function findMrxFromVendor(address vendorAddress) public override view returns (address)
        {
        return vendor2mrx[vendorAddress];
        }

    function isRegistered(address mrxAddress) public view returns (bool)
        {
        return mrx2vendor[mrxAddress] != address(0);
        }

    function getWrappedAsset() public view returns (address)
        {
        return wrappedAssetAddr;
        }

    function registerAsVendor(address mrxAddress, bytes memory signature) public whenNotPaused
        {
        require(mrxAddress != address(0), "VendorRegistry: Registration failed, the MRX address can not be zero.");
        require(mrx2vendor[mrxAddress] == address(0) && vendor2mrx[msg.sender] == address(0), "VendorRegistry: Registration failed, 1 or more addresses have already been registered.");
        bytes memory message = abi.encodePacked(msg.sender, address(this), mrxAddress);
        require(addressIsAManager(recoverSigner(message, signature)), "VendorRegistry: Registration failed, invalid signature.");
        mrx2vendor[mrxAddress] = msg.sender;
        vendor2mrx[msg.sender] = mrxAddress;
        emit Registered(mrxAddress, msg.sender);
        }

    function setVendorRegistration(address mrxAddress, address vendorAddress) public isManager
        {
        require(mrxAddress != address(0) && vendorAddress != address(0), "VendorRegistry: Registration failed, the zero address can not be registered.");
        bool registrationHappened = false;
        address existingMrxAddress = vendor2mrx[vendorAddress];
        if (existingMrxAddress != mrxAddress)
            {
            if (existingMrxAddress != address(0))
                {
                emit Unregistered(existingMrxAddress, mrx2vendor[existingMrxAddress]);
                mrx2vendor[existingMrxAddress] = address(0);
                }
            registrationHappened = true;
            vendor2mrx[vendorAddress] = mrxAddress;
            }
        address existingVendorAddress = mrx2vendor[mrxAddress];
        if (existingVendorAddress != vendorAddress)
            {
            require(existingVendorAddress == address(0), "VendorRegistry: Registration failed, the MRX address has already been registered.");
            registrationHappened = true;
            mrx2vendor[mrxAddress] = vendorAddress;
            }
        if (registrationHappened) emit Registered(mrxAddress, vendorAddress);
        }

    function migrateVendorRegistration(address mrxAddress, address vendorAddress) external
        {
        require(msg.sender == wrappedAssetAddr, "VendorRegistry: Access not permitted.");
        require(mrxAddress != address(0) && vendorAddress != address(0), "VendorRegistry: Registration failed, the zero address can not be registered.");
        if (vendor2mrx[vendorAddress] == address(0))
            {
            require(mrx2vendor[mrxAddress] == address(0), "VendorRegistry: Registration failed, the MRX address has already been registered.");
            vendor2mrx[vendorAddress] = mrxAddress;
            mrx2vendor[mrxAddress] = vendorAddress;
            emit Registered(mrxAddress, vendorAddress);
            }
        }

    function pause() public isManager
        {
        _pause();
        }

    function unpause() public isManager
        {
        _unpause();
        }

    function recoverSigner(bytes memory message, bytes memory signature) internal pure returns (address)
        {
        require(signature.length == 65, "VendorRegistry: Action failed due to an invalid signature.");
        uint8 v;
        bytes32 r;
        bytes32 s;
        assembly
            {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
            }
        return ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(message))), v, r, s);
        }
    }
