// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IMigratableWrappedAsset 
    {
    function migrationBurn(address account, uint256 maxAmount) external returns (uint256);
    }
