import { default as HDWalletProvider } from "@truffle/hdwallet-provider";
import { default as Web3             } from "web3";
import   dotenv                        from 'dotenv';
import { SolidityUtils               } from "./solidityutils";



console.log(`DEPLOYER : BSC STARTING ${new Date().toUTCString()}`);
dotenv.config();

const BSC_URL       = checkAndFetchEnv("DEPLOY_BSC_URL");
const BSC_NAME      = checkAndFetchEnv("DEPLOY_BSC_TOKEN_NAME");
const BSC_SYMBOL    = checkAndFetchEnv("DEPLOY_BSC_SYMBOL");
const BSC_CAP       = checkAndFetchEnv("DEPLOY_BSC_CAP");
const BSC_SS_PERIOD = checkAndFetchEnv("DEPLOY_BSC_SNAPSHOT_PERIOD");
const BSC_GAS       = parseInt(checkAndFetchEnv("DEPLOY_BSC_GAS"));
const BSC_METADATA  = { deploymentUrl: BSC_URL };
const SAVE_DIR      = (process.env.DEPLOY_DEPLOYMENT_NAME ? checkAndFetchEnv("DEPLOY_DEPLOYMENT_NAME") : "noname") + "/bsc";

let usePneumonic = true;
if (process.env.DEPLOY_BSC_PRIVATE_KEY)
    usePneumonic = false;
else if (!process.env.DEPLOY_BSC_PNEUMONIC)
    throw new Error(`DEPLOYMENT FAILED: Neither environmental variable DEPLOY_BSC_PRIVATE_KEY nor DEPLOY_BSC_PNEUMONIC is set.`);

deploy().then(() =>
    {
    console.log(`DEPLOYER : BSC FINISHED ${new Date().toUTCString()}`);
    process.exit();
    });

async function deploy() : Promise<void>
    {
    try
        {
        const wallet = usePneumonic ? new HDWalletProvider(process.env.DEPLOY_BSC_PNEUMONIC as string, BSC_URL) : new HDWalletProvider({ providerOrUrl: BSC_URL, privateKeys: [ process.env.DEPLOY_BSC_PRIVATE_KEY! ] });
        const w3 = new Web3(wallet);
        const vr = await SolidityUtils.deployFromSource("vendorregistry.sol", w3, 0, [ BSC_NAME, BSC_SYMBOL, BSC_CAP, BSC_SS_PERIOD ], BSC_GAS, SAVE_DIR, BSC_METADATA);
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
