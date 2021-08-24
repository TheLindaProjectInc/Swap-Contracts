import { default as HDWalletProvider } from "@truffle/hdwallet-provider";
import { default as Web3             } from "web3";
import   dotenv                        from 'dotenv';
import { SolidityUtils               } from "./solidityutils";



console.log(`DEPLOYER : ETH STARTING ${new Date().toUTCString()}`);
dotenv.config();

const ETH_URL       = checkAndFetchEnv("DEPLOY_ETH_URL");
const ETH_NAME      = checkAndFetchEnv("DEPLOY_ETH_TOKEN_NAME");
const ETH_SYMBOL    = checkAndFetchEnv("DEPLOY_ETH_SYMBOL");
const ETH_CAP       = checkAndFetchEnv("DEPLOY_ETH_CAP");
const ETH_SS_PERIOD = checkAndFetchEnv("DEPLOY_ETH_SNAPSHOT_PERIOD");
const ETH_GAS       = parseInt(checkAndFetchEnv("DEPLOY_ETH_GAS"));
const ETH_METADATA  = { deploymentUrl: ETH_URL };
const SAVE_DIR      = (process.env.DEPLOY_DEPLOYMENT_NAME ? checkAndFetchEnv("DEPLOY_DEPLOYMENT_NAME") : "noname") + "/eth";

let useMnemonic = true;
if (process.env.DEPLOY_ETH_PRIVATE_KEY)
    useMnemonic = false;
else if (!process.env.DEPLOY_ETH_MNEMONIC)
    throw new Error(`DEPLOYMENT FAILED: Neither environmental variable DEPLOY_ETH_PRIVATE_KEY nor DEPLOY_ETH_MNEMONIC is set.`);

deploy().then(() =>
    {
    console.log(`DEPLOYER : ETH FINISHED ${new Date().toUTCString()}`);
    process.exit();
    });

async function deploy() : Promise<void>
    {
    try
        {
        const wallet = useMnemonic ? new HDWalletProvider(process.env.DEPLOY_ETH_MNEMONIC as string, ETH_URL) : new HDWalletProvider({ providerOrUrl: ETH_URL, privateKeys: [ process.env.DEPLOY_ETH_PRIVATE_KEY! ] });
        const w3 = new Web3(wallet);
        const vr = await SolidityUtils.deployFromSource("vendorregistry.sol", w3, 0, [ ETH_NAME, ETH_SYMBOL, ETH_CAP, ETH_SS_PERIOD ], ETH_GAS, SAVE_DIR, ETH_METADATA);
        const waAddr = await vr.methods.getWrappedAsset().call();
        SolidityUtils.saveAlsoDeployedContract(SAVE_DIR, "wrappedasset.sol", waAddr);
        }
    catch (e)
        {
        console.log(`DEPLOYER : ERROR ERROR ERROR`);
        console.log(e);
        }
    }

function checkAndFetchEnv(name : string) : string
    {
    if (typeof(process.env[name]) != "string") throw new Error(`DEPLOYMENT FAILED: Environmental variable ${name} is not set.`);
    console.log(`DEPLOYER :     ${name} = ${process.env[name]}`);
    return process.env[name]!;
    }
