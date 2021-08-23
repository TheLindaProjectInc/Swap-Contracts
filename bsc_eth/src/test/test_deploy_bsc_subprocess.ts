import { default as HDWalletProvider } from "@truffle/hdwallet-provider";
import { default as Web3             } from "web3";
import   dotenv                        from 'dotenv';
import { SolidityUtils               } from "../solidityutils";



console.log(`DEPLOYER : TEST BSC STARTING ${new Date().toUTCString()}`);
dotenv.config();

const BSC_URL      = checkAndFetchEnv("DEPLOY_BSC_URL");
const BSC_METADATA = { deploymentUrl: BSC_URL };
const SAVE_DIR     = "test_" + (process.env.DEPLOY_DEPLOYMENT_NAME ? checkAndFetchEnv("DEPLOY_DEPLOYMENT_NAME") : "noname") + "/bsc";

let usePneumonic = true;
if (process.env.DEPLOY_BSC_PRIVATE_KEY)
    usePneumonic = false;
else if (!process.env.DEPLOY_BSC_PNEUMONIC)
    throw new Error(`DEPLOYMENT FAILED: Neither environmental variable DEPLOY_BSC_PRIVATE_KEY nor DEPLOY_BSC_PNEUMONIC is set.`);

deploy().then(() =>
    {
    console.log(`DEPLOYER : TEST BSC FINISHED ${new Date().toUTCString()}`);
    process.exit();
    });

async function deploy() : Promise<void>
    {
    try
        {
        const wallet = usePneumonic ? new HDWalletProvider(process.env.DEPLOY_BSC_PNEUMONIC as string, BSC_URL) : new HDWalletProvider({ providerOrUrl: BSC_URL, privateKeys: [ process.env.DEPLOY_BSC_PRIVATE_KEY! ] });
        const w3 = new Web3(wallet);
        await SolidityUtils.deployFromSource("test_receiver.sol", w3, 0, [  ], 2000000, SAVE_DIR + "/receiver", BSC_METADATA);
        await SolidityUtils.deployFromSource("test_spender.sol",  w3, 0, [  ], 2000000, SAVE_DIR + "/spender",  BSC_METADATA);
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
