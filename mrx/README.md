# MRXb/MRXe Custodial Contracts

This repository is a suite of contracts as well as the scripts needed to deploy them.

_**Note:** This feature is not slated for use until there is Web3 support for Metrix_

### Prerequisites

- [NodeJS 14+](https://nodejs.org/en/download/)
- [TypeScript](https://www.typescriptlang.org/#installation)
- [solc](https://docs.soliditylang.org/en/v0.8.7/installing-solidity.html)
- [metrixd](https://github.com/TheLindaProjectInc/Metrix/releases)

### Scripts

- `npm install` - install the project dependencies
- `npm run buildTs` - transpile the typescript project
- `npm run buildSol` - compile the solidity project
- `npm run build` - oneshot script to compile/transpile both the typescript and solidity
- `npm run deploy` - deploy the built contracts to Metrix (need to copy example.env to .env and configure)
