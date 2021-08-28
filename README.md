[![MythXBadge](https://badgen.net/https/api.mythx.io/v1/projects/3d84f8bd-e15a-46b3-8e33-e9286b595dde/badge/data?cache=300&icon=https://raw.githubusercontent.com/ConsenSys/mythx-github-badge/main/logo_white.svg)](https://docs.mythx.io/dashboard/github-badges) [![BSC/ETH CI](https://github.com/TheLindaProjectInc/Swap-Contracts/actions/workflows/bsc_eth.yml/badge.svg)](https://github.com/TheLindaProjectInc/Swap-Contracts/actions/workflows/bsc_eth.yml)

# Swap Contracts

## bsc_eth  

This repository contains a suite of contracts for a VendorRegistry which contains the mappings and reverse mappings of vendors. 

The suite contains a WrappedAsset (MRXb/MRXe ERC20) as well which is deployed with the VendorRegistry.

Also included are the scripts needed to compile and deploy on BSC/ETH and other tools. 

This is "Wrapped Metrix" is backed 1:1 by a custodian who provides cryptographic and chaindata proof that the funds are 100% backed. 

_**Note:** MRXb/MRXe may only be unwrapped by registered vendors in version 1.0 which is a process in which a mapping and reverse mapping are stored on the blockchain._

## mrx  

This repository contains a suite of contracts for locking reserves backing MRXb/MRXe as well as the scripts needed to deploy them on Metrix and other tools.  

_**Note:** This feature will not be ready to release on production until Web3 capabilities are accessible to users._

