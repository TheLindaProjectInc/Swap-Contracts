// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./erc1363.sol";
import "./pausable.sol";
import "./managable.sol";
import "./vendorregistry.sol";
import "./imigratablewrappedasset.sol";
import "./imigratablevendorregistry.sol";



contract WrappedAsset is ERC1363, Pausable, Managable, IMigratableWrappedAsset
    {
    address                  public  prevVendorRegistry      = address(0);
    address                  public  prevWrappedAsset        = address(0);
    address                  public  nextWrappedAsset        = address(0);

    uint256 immutable        private maxSupply;
    uint256                  private snapshotIntervalSeconds;
    uint256                  private snapshotId              = 0;
    uint256                  private snapshotBlockTimestamp  = 0;
    mapping(bytes32 => bool) private usedNonces;
    address                  private registryAddr            = address(0);
    VendorRegistry           private registry;

    event SnapshotInfo(uint256 indexed blockTimestamp, uint256 indexed blockNumber, uint256 indexed snapshotId);

    constructor(string memory tokenName, string memory tokenSymbol, uint256 tokenCap, uint256 tokenSnapshotIntervalHours) ERC20(tokenName, tokenSymbol) Ownable() Pausable()
        {
        require(tokenCap > 0, "WrappedAsset: The maxSupply is 0, it must be > 0.");
        require(tokenSnapshotIntervalHours > 0, "WrappedAsset: The time between snapshots can't be 0, it must be at least 1 hour.");
        maxSupply = tokenCap;
        snapshotIntervalSeconds = 60*60*tokenSnapshotIntervalHours;
        }

    function setVendorRegistry(address vendorRegistryAddress) public isOwner
        {
        registryAddr = vendorRegistryAddress;
        registry = VendorRegistry(vendorRegistryAddress);
        }

    function getVendorRegistry() public view returns (address)
        {
        return registryAddr;
        }

    function setPrevVersion(address vendorRegistry, address wrappedAsset) public isOwner
        {
        require(vendorRegistry != address(0), "WrappedAsset: The address of the previous VendorRegistry can't be 0.");
        require(wrappedAsset != address(0), "WrappedAsset: The address of the previous WrappedAsset can't be 0.");
        require(prevVendorRegistry == address(0), "WrappedAsset: The previous version has already been set.");
        prevVendorRegistry = vendorRegistry;
        prevWrappedAsset = wrappedAsset;
        }

    function setNextVersion(address wrappedAsset) public isOwner
        {
        require(wrappedAsset != address(0), "WrappedAsset: The address of the next WrappedAsset can't be 0.");
        require(nextWrappedAsset == address(0), "WrappedAsset: The next version has already been set.");
        nextWrappedAsset = wrappedAsset;
        }

    function name() public view virtual override returns (string memory)
        {
        return super.name();
        }

    function symbol() public view virtual override returns (string memory)
        {
        return super.symbol();
        }

    function decimals() public view virtual override returns (uint8)
        {
        return 8;
        }

    function cap() public view returns (uint256)
        {
        return maxSupply;
        }

    function unusedSupply() public view virtual returns (uint256)
        {
        return maxSupply - totalSupply();
        }

    function totalSupply() public view virtual override returns (uint256)
        {
        return super.totalSupply();
        }

    function balance() public view virtual returns (uint256)
        {
        return super.balanceOf(_msgSender());
        }

    function balanceOf(address account) public view virtual override returns (uint256)
        {
        return super.balanceOf(account);
        }

    function transfer(address recipient, uint256 amount) public virtual override returns (bool)
        {
        return super.transfer(recipient, amount);
        }

    function migrateFromPreviousVersion() public
        {
        require(prevVendorRegistry != address(0), "WrappedAsset: Migration failed because the previous version has not been set.");
        IMigratableVendorRegistry prevVr = IMigratableVendorRegistry(prevVendorRegistry);
        address mrxAddress = prevVr.findMrxFromVendor(_msgSender());
        require(mrxAddress != address(0), "WrappedAsset: Migration failed because the caller is not registered with the previous version.");
        if (registry.findMrxFromVendor(_msgSender()) == address(0)) registry.migrateVendorRegistration(mrxAddress, _msgSender());
        IMigratableWrappedAsset prevWa = IMigratableWrappedAsset(prevWrappedAsset);
        uint256 amount = prevWa.migrationBurn(_msgSender(), unusedSupply());
        _mint(_msgSender(), amount);
        }

    function vendorMint(uint256 amount, bytes32 nonce, bytes memory signature) public whenNotPaused
        {
        require(totalSupply() + amount <= maxSupply, "WrappedAsset: Mint failed, it would exceed the cap.");
        require(registry.findMrxFromVendor(msg.sender) != address(0), "WrappedAsset: Mint failed, the caller's address has not been registered as a vendor.");
        require(!usedNonces[nonce], "WrappedAsset: Mint failed, this mint has been used before.");
        usedNonces[nonce] = true;
        bytes memory message = abi.encodePacked(msg.sender, amount, address(this), nonce);
        require(addressIsAManager(recoverSigner(message, signature)), "WrappedAsset: Mint failed, invalid signature.");
        _mint(_msgSender(), amount);
        }

    function mintRedeemed(bytes32 nonce) public view returns (bool)
        {
        return usedNonces[nonce];
        }

    function mint(uint256 amount) public isManager virtual
        {
        require(totalSupply() + amount <= maxSupply, "WrappedAsset: Mint failed, it would exceed the cap.");
        _mint(_msgSender(), amount);
        }

    function burn(uint256 amount) public virtual
        {
        require(registry.findMrxFromVendor(_msgSender()) != address(0), "WrappedAsset: Burn failed, the caller's address has not been registered as a vendor.");
        _burn(_msgSender(), amount);
        }

    function migrationBurn(address account, uint256 maxAmount) external override returns (uint256)
        {
        require(address(0) != nextWrappedAsset, "WrappedAsset: Migration failed because the next version has not been set.");
        require(_msgSender() == nextWrappedAsset, "WrappedAsset: Access not permitted.");
        require(registry.findMrxFromVendor(account) != address(0), "WrappedAsset: Migration failed, the caller's address has not been registered as a vendor.");
        uint256 amount = balanceOf(account);
        if (amount > maxAmount) amount = maxAmount;
        _burn(account, amount);
        return amount;
        }

    function allowance(address owner, address spender) public view virtual override returns (uint256)
        {
        return super.allowance(owner, spender);
        }

    function approve(address spender, uint256 amount) public virtual override returns (bool)
        {
        return super.approve(spender, amount);
        }

    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool)
        {
        return super.transferFrom(sender, recipient, amount);
        }

    function increaseAllowance(address spender, uint256 addedValue) public virtual override returns (bool)
        {
        return super.increaseAllowance(spender, addedValue);
        }

    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual override returns (bool)
        {
        return super.decreaseAllowance(spender, subtractedValue);
        }

    function pause() public isManager virtual
        {
        _pause();
        }

    function unpause() public isManager virtual
        {
        _unpause();
        }

    function paused() public view virtual override returns (bool)
        {
        return super.paused();
        }

    function balanceOfAt(address account, uint256 snapId) public view virtual override returns (uint256)
        {
        return super.balanceOfAt(account, snapId);
        }

    function totalSupplyAt(uint256 snapId) public view virtual override returns(uint256)
        {
        return super.totalSupplyAt(snapId);
        }

    function getCurrentSnapshotId() public view virtual returns (uint256)
        {
        return _getCurrentSnapshotId();
        }

    function takeSnapshot() public isManager virtual returns (uint256)
        {
        nextSnapshotId(block.timestamp);
        return _getCurrentSnapshotId();
        }

    function setSnapshotIntervalHours(uint256 snapshotIntervalHours) public isManager virtual
        {
        require(snapshotIntervalHours > 0, "WrappedAsset: The time between snapshots can't be 0, it must be at least 1 hour.");
        snapshotIntervalSeconds = 60*60*snapshotIntervalHours;
        }

    function getSnapshotIntervalHours() public view virtual returns (uint256)
        {
        return snapshotIntervalSeconds/(60*60);
        }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override whenNotPaused
        {
        uint256 timestamp = block.timestamp;
        if (timestamp > snapshotBlockTimestamp + snapshotIntervalSeconds) nextSnapshotId(timestamp);
        super._beforeTokenTransfer(from, to, amount);
        }

    function nextSnapshotId(uint256 blockTimestamp) private
        {
        snapshotId++;
        snapshotBlockTimestamp = blockTimestamp;
        emit SnapshotInfo(blockTimestamp, block.number, snapshotId);
        }

    function _getCurrentSnapshotId() internal view virtual override returns (uint256)
        {
        return snapshotId;
        }

    function recoverSigner(bytes memory message, bytes memory signature) internal pure returns (address)
        {
        require(signature.length == 65, "WrappedAsset: Action failed, invalid signature.");
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
