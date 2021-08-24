/*
Environmental Variable       Usage
======================       =====
DEPLOY_DEPLOYMENT_NAME       Optional (defaults to "noname"), used as the name of the directory where the deployment information, etc is saved.

DEPLOY_ETH_PRIVATE_KEY       The private key for the deployment account (set either DEPLOY_ETH_MNEMONIC or DEPLOY_ETH_PRIVATE_KEY).
DEPLOY_ETH_MNEMONIC          The mnemonic for the deployment account (set either DEPLOY_ETH_MNEMONIC or DEPLOY_ETH_PRIVATE_KEY).
DEPLOY_ETH_URL               The URL of the blockchain node to be used for deployment.
DEPLOY_ETH_GAS               The gas limit for the deployment.
DEPLOY_ETH_TOKEN_NAME        The name of the fungible token.
DEPLOY_ETH_SYMBOL            The symbol for the fungible token.
DEPLOY_ETH_CAP               The maximum total amount of fungible tokens alloweed.
DEPLOY_ETH_SNAPSHOT_PERIOD   The number of hours between automatic snapshots.

All the DEPLOY_ETH_ environmental variables have equivelent DEPLOY_BSC_ forms.
*/



import   path                      from "path";
import   fs                        from "fs-extra";
import { default as childProcess } from 'child_process';
import   dotenv                    from 'dotenv';



const DEPLOYED_DIR = "solidity_utils_deployments";

const TS_PART_1 =
`const INFO =
    {
    wrappedAsset:
        {
        ethAddress: "`;
const TS_PART_2 =  
`",
        bscAddress: "`;
const TS_PART_3 =  
`",
        abi:        \``;
const TS_PART_4 =  
`\`
        },
    vendorRegistry:
        {
        ethAddress: "`;
const TS_PART_5 =  
`",
        bscAddress: "`;
const TS_PART_6 =  
`",
        abi:        \``;
const TS_PART_7 = 
`\`
        }
    };
export default INFO;
`;



const JSON_PART_1 =
`{
"wrappedAsset":
    {
    "ethAddress": "`;
const JSON_PART_2 =  
`",
    "bscAddress": "`;
const JSON_PART_3 =  
`",
    "abiStr":     "`;
const JSON_PART_4 =  
`",
    "abi":        `;
const JSON_PART_5 =  
`
    },
"vendorRegistry":
    {
    "ethAddress": "`;
const JSON_PART_6 =  
`",
    "bscAddress": "`;
const JSON_PART_7 =  
`",
    "abiStr":     "`;
const JSON_PART_8 =  
`",
    "abi":        `;
const JSON_PART_9 = 
`
    }
}
`;



console.log(`DEPLOYER : STARTING ${new Date().toUTCString()}`);
dotenv.config();
const SAVE_DIR = process.env.DEPLOY_DEPLOYMENT_NAME ? process.env.DEPLOY_DEPLOYMENT_NAME : "noname";

deploy().then(() =>
    {
    console.log(`DEPLOYER : FINISHED ${new Date().toUTCString()}`);
    process.exit();
    });

async function deploy() : Promise<void>
    {
    try
        {
        await runNodeJs("dist/deploy_eth_subprocess.js");
        await runNodeJs("dist/deploy_bsc_subprocess.js");
        const ethWA = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', DEPLOYED_DIR, SAVE_DIR, "eth", "wrappedasset",   "loaderinfo.json")).toString("utf8"))
        const ethVR = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', DEPLOYED_DIR, SAVE_DIR, "eth", "vendorregistry", "loaderinfo.json")).toString("utf8"))
        const bscWA = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', DEPLOYED_DIR, SAVE_DIR, "bsc", "wrappedasset",   "loaderinfo.json")).toString("utf8"))
        const bscVR = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', DEPLOYED_DIR, SAVE_DIR, "bsc", "vendorregistry", "loaderinfo.json")).toString("utf8"))
        const waAbi = JSON.stringify(ethWA.abi);
        const vrAbi = JSON.stringify(ethVR.abi);
        const tsStr =
            TS_PART_1 + ethWA.address +
            TS_PART_2 + bscWA.address +
            TS_PART_3 + waAbi +
            TS_PART_4 + ethVR.address +
            TS_PART_5 + bscVR.address +
            TS_PART_6 + vrAbi +
            TS_PART_7;
        const jsonStr =
            JSON_PART_1 + ethWA.address +
            JSON_PART_2 + bscWA.address +
            JSON_PART_3 + waAbi.replace(new RegExp("\"", "g"), "\\\"") +
            JSON_PART_4 + waAbi +
            JSON_PART_5 + ethVR.address +
            JSON_PART_6 + bscVR.address +
            JSON_PART_7 + vrAbi.replace(new RegExp("\"", "g"), "\\\"") +
            JSON_PART_8 + vrAbi +
            JSON_PART_9;
        const outputDir = path.resolve(__dirname, '..', DEPLOYED_DIR, SAVE_DIR);
        const tsFile = path.resolve(outputDir, "info.ts");
        console.log(`DEPLOYER :     SAVING TYPESCRIPT LOADER INFO OBJECT info.ts  -->  ${tsFile}`);
        fs.writeFileSync(tsFile, tsStr);
        const jsonFile = path.resolve(outputDir, "info.json");
        console.log(`DEPLOYER :     SAVING JSON LOADER INFO OBJECT info.json  -->  ${jsonFile}`);
        fs.writeFileSync(jsonFile, jsonStr);
        }
    catch (e)
        {
        console.log(`DEPLOYER : ERROR ERROR ERROR`);
        console.log(e);
        }
    }

function runNodeJs(javascriptFile : string) : Promise<void>
    {
    return new Promise<void>((resolve: () => any, reject : (e : Error) => any) : void =>
        {
        let done = false;
        const process = childProcess.fork(javascriptFile);
        process.on("error", (e : Error) : void =>
            {
            if (done) return;
            done = true;
            reject(e);
            });
        process.on("exit", (exitCode : number) : void =>
            {
            if (done) return;
            done = true;
            if (exitCode === 0)
                resolve();
            else
                reject(new Error("Subprocess terminated with non zero exit code: " + exitCode));
            });
        });
    }
