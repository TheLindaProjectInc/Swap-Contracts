// SPDX-License-Identifier: CC0-1.0

pragma solidity ^0.8.0;

interface IMigratableVendorRegistry
    {
    function findMrxFromVendor(address vendorAddress) external view returns (address);
    }
