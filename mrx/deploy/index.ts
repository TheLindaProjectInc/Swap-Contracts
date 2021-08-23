import dotenv from "dotenv";
import { MetrixContractDeployer } from "./app/MetrixContractDeployer";

dotenv.config();

let start: () => Promise<void>;
if (process.env.RPC_URL == undefined) {
  start = async () => {
    console.log(`RPC_URL is undefined`);
    process.exit(1);
  };
} else if (process.env.RPC_USER == undefined) {
  start = async () => {
    console.log(`RPC_USER is undefined`);
    process.exit(1);
  };
} else if (process.env.RPC_PASSWORD == undefined) {
  start = async () => {
    console.log(`RPC_PASSWORD is undefined`);
    process.exit(1);
  };
} else if (process.env.DEPLOYMENT_ACCT == undefined) {
  start = async () => {
    console.log(`DEPLOYMENT_ACCT is undefined`);
    process.exit(1);
  };
} else if (process.env.GAS_LIMIT == undefined) {
  start = async () => {
    console.log(`GAS_LIMIT is undefined`);
    process.exit(1);
  };
} else if (process.env.GAS_PRICE == undefined) {
  start = async () => {
    console.log(`GAS_LIMIT is undefined`);
    process.exit(1);
  };
} else {
  start = async () => {
    const deployer = new MetrixContractDeployer();
    await deployer.deploy();
  };
}
start();
