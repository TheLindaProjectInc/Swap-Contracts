// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

interface IOwnable
    {
    function getOwner() external view returns (address);
    modifier isOwner() virtual;
    }
