const solc = require('solc');
const path = require('path');
const fs = require('fs-extra');

const buildPath = path.resolve(__dirname, '..', 'build');
let sources = new Map();
const contractsPath = path.resolve(__dirname, '..', 'contracts');

function findImports(path) {
  if (sources.has(path.replace(/^.*[\\\/]/, '')))
    return {
      contents: sources.get(path.replace(/^.*[\\\/]/, '')),
    };
  else return { error: 'File not found' };
}

try {
  fs.removeSync(buildPath);

  fs.readdirSync(contractsPath).forEach(function (file) {
    const content = fs
      .readFileSync(path.resolve(contractsPath, file))
      .toString();
    sources.set(file, content);
  });

  const input = {
    language: 'Solidity',
    sources: {
      'burnattestor.sol': {
        content: sources.get('burnattestor.sol'),
      },
      'custodian.sol': {
        content: sources.get('custodian.sol'),
      },
      'managable.sol': {
        content: sources.get('managable.sol'),
      },
      'ownable.sol': {
        content: sources.get('ownable.sol'),
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['*'],
        },
      },
    },
  };

  const output = JSON.parse(
    solc.compile(JSON.stringify(input), { import: findImports })
  );

  fs.ensureDirSync(buildPath);

  for (let contract in output) {
    switch(contract.toLowerCase()) {
      case "contracts":
        fs.ensureDirSync(path.resolve(buildPath, contract));
        fs.ensureDirSync(path.resolve(buildPath, "abi"));
        fs.ensureDirSync(path.resolve(buildPath, "bytecode"));
        fs.ensureDirSync(path.resolve(buildPath, "functions"));
        for (let c in output[contract]) {
          const fileName = c.replace('.sol', '').replace(':', '') + '.json';
          console.log(`Writing ${path.resolve(buildPath, contract, fileName)}`);
          fs.outputJsonSync(
            path.resolve(buildPath, contract, fileName),
            output[contract]
          );
          if(output[contract][c][Object.keys(output[contract][c])[0]].evm) {
            console.log(`Writing ${path.resolve(buildPath, "bytecode", fileName.replace('.json', '.hex'))}`);
            fs.writeFileSync(
              path.resolve(buildPath, "bytecode", fileName.replace('.json', '.hex')),
              output[contract][c][Object.keys(output[contract][c])[0]].evm.bytecode.object
            );
            console.log(`Writing ${path.resolve(buildPath, "abi", fileName)}`);
            fs.writeFileSync(
              path.resolve(buildPath, "abi", fileName),
              JSON.stringify(output[contract][c][Object.keys(output[contract][c])[0]].abi, null, 2)
            );
            console.log(`Writing ${path.resolve(buildPath, "functions", fileName)}`);
            fs.writeFileSync(
              path.resolve(buildPath, "functions", fileName),
              JSON.stringify(output[contract][c][Object.keys(output[contract][c])[0]].evm.methodIdentifiers, null, 2)
            );
          }

        }
        break;
      case "sources":
        const fileName = contract.replace('.sol', '').replace(':', '') + '.json';
        fs.ensureDirSync(path.resolve(buildPath, contract));
        console.log(`Writing ${path.resolve(buildPath, contract, fileName)}`);

        fs.outputJsonSync(path.resolve(buildPath, contract, fileName), output[contract]);
        break;
      default:
        break;
    }
    
  }
} catch (e) {
  console.log(e);
}
