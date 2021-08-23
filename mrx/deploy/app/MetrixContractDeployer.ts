import { MetrixRPCNode } from "../lib/MetrixRPC/MetrixRPC";
import { BigNumber, utils } from "ethers";

import fs from "fs";
import path from "path";
const buildDirectory = path.join(__dirname, "..", "..", "build");
const abiFile = path.join(buildDirectory, "abi", "custodian.json");
const bytecodeFile = path.join(buildDirectory, "bytecode", "custodian.hex");
console.log(`buildDirectory: ${buildDirectory}`);
console.log(`abiFile: ${abiFile}`);

function parseFromIntString(intString: string, precision: number): string {
  let length = intString.length;
  let integers = "0";
  let decimals = "0";
  if (length > precision) {
    integers = intString.substring(0, length - precision);
    decimals = intString.substring(length - precision, length);
  } else {
    integers = "0";
    decimals = "";
    for (let i = 0; i < precision; i++) {
      if (i <= length - 1) {
        decimals += intString.substring(i, i + 1);
      } else {
        decimals = "0" + decimals;
      }
    }
  }
  return `${integers}.${decimals}`;
}

class MetrixContractDeployer {
  private mrpc: MetrixRPCNode;
  private abi: any;
  private bytecode: string;

  constructor() {
    this.mrpc = new MetrixRPCNode(
      process.env.DEPLOYMENT_ACCT ? process.env.DEPLOYMENT_ACCT : null,
      process.env.RPC_URL as string,
      process.env.RPC_USER as string,
      process.env.RPC_PASSWORD as string
    );
    if (!fs.existsSync(abiFile)) {
      console.log("Failed to load abi. Must build contracts first!");
      process.exit(1);
    }
    if (!fs.existsSync(bytecodeFile)) {
      console.log("Failed to load bytecode. Must build contracts first!");
      process.exit(1);
    }

    this.abi = JSON.parse(fs.readFileSync(abiFile).toString());
    this.bytecode = fs.readFileSync(bytecodeFile).toString();
  }

  public async deploy(): Promise<void> {
    const iface = new utils.Interface(this.abi);
    const deployment = await this.mrpc.promiseCreateContract(
      `${this.bytecode}${iface.encodeDeploy([BigNumber.from(process.env.ATTESTATIONS as string)]).replace("0x", "")}`,
      Number(process.env.GAS_LIMIT),
      parseFromIntString(process.env.GAS_PRICE as string, 8),
      process.env.DEPLOYMENT_ACCT as string
    );
    
    if (deployment) {
      try {
        const { txid, sender, hash160, address } = deployment;

        let transaction = await this.mrpc.promiseGetTransaction(txid);
        let transactionReceipt = await this.mrpc.promiseGetTransactionReceipt(
          txid
        );
        console.log(
          `txid: ${transaction.txid} confirmations: ${transaction.confirmations}`
        );
        console.log(`receipt: ${JSON.stringify(transactionReceipt, null, 2)}`);
        while (
          transactionReceipt.length < 1 ||
          (transaction.confirmations < 1 && transaction.confirmations > -1)
        ) {
          console.log("Waiting for the transaction to confirm");
          await new Promise((resolve) => setTimeout(resolve, 60000));
          transaction = await this.mrpc.promiseGetTransaction(txid);
          transactionReceipt = await this.mrpc.promiseGetTransactionReceipt(
            txid
          );
        }
        console.log(
          `txid: ${transaction.txid} confirmations: ${transaction.confirmations}`
        );
        if (transaction.confirmations == -1) {
          console.log(`Failed, transaction orphaned`);
          return;
        }
        const contracts = [];
        

        const eventMap = new Map();
        for (const receipt of transactionReceipt) {
          for (const log of receipt.log) {
            const topics = log.topics.map((topic: string) => {
              return `0x${topic}`;
            });
            const data = `0x${log.data}`;
            const description = iface.parseLog({ data, topics });
            const event = description.eventFragment;

            if (description && event) {
              const name = event.name;
              let events = eventMap.get(name) ? eventMap.get(name) : [];
              events.push({ event, description, timestamp: log.timestamp });
              eventMap.set(name, events);
            }
          }
          console.log(
            `receipt: ${JSON.stringify(transactionReceipt, null, 2)}`
          );
          if (
            receipt.excepted == "OutOfGas" ||
            receipt.excepted == "OutOfGasIntrinsic"
          ) {
            console.log(`Failed, ${receipt.excepted}`);
          } else {
            const contract = receipt.contractAddress;
            if (contracts.indexOf(contract) == -1) contracts.push(contract);
            console.log("Success!");
            console.log(
              `txid: ${txid}\nsender: ${sender}\nhash160: ${hash160}\naddress: ${address}`
            );            
          }
        }
        for (const key of eventMap.keys()) {
          for (const event of eventMap.get(key) ? eventMap.get(key) : []) {
            console.log(JSON.stringify(event, null, 2));
          }
        }
      } catch (e) {
        console.log(
          `Failed, ${e.message ? e.message : "An unknown error occurred"}`
        );
      }
    }
  }
}

export { MetrixContractDeployer };
