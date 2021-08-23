import { default as HDWalletProvider } from "@truffle/hdwallet-provider";
import { default as Web3             } from "web3";
import   dotenv                        from 'dotenv';
import { SolidityUtils               } from "../solidityutils";



console.log(`DEPLOYER : TEST ETH STARTING ${new Date().toUTCString()}`);
dotenv.config();

const ETH_URL      = checkAndFetchEnv("DEPLOY_ETH_URL");
const ETH_METADATA = { deploymentUrl: ETH_URL };
const SAVE_DIR     = "test_" + (process.env.DEPLOY_DEPLOYMENT_NAME ? checkAndFetchEnv("DEPLOY_DEPLOYMENT_NAME") : "noname") + "/eth";

let usePneumonic = true;
if (process.env.DEPLOY_ETH_PRIVATE_KEY)
    usePneumonic = false;
else if (!process.env.DEPLOY_ETH_PNEUMONIC)
    throw new Error(`DEPLOYMENT FAILED: Neither environmental variable DEPLOY_ETH_PRIVATE_KEY nor DEPLOY_ETH_PNEUMONIC is set.`);

deploy().then(() =>
    {
    console.log(`DEPLOYER : TEST ETH FINISHED ${new Date().toUTCString()}`);
    process.exit();
    });

async function deploy() : Promise<void>
    {
    try
        {
        const wallet = usePneumonic ? new HDWalletProvider(process.env.DEPLOY_ETH_PNEUMONIC as string, ETH_URL) : new HDWalletProvider({ providerOrUrl: ETH_URL, privateKeys: [ process.env.DEPLOY_ETH_PRIVATE_KEY! ] });
        const w3 = new Web3(wallet);
        await SolidityUtils.deployFromSource("test_receiver.sol", w3, 0, [  ], 2000000, SAVE_DIR + "/receiver", ETH_METADATA);
        await SolidityUtils.deployFromSource("test_spender.sol",  w3, 0, [  ], 2000000, SAVE_DIR + "/spender",  ETH_METADATA);
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
