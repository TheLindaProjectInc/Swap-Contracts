import path                from "path";
import fs                  from "fs-extra";
import solc                from "solc";
import { Contract }        from "web3-eth-contract";
import { default as Web3 } from "web3";



const CONTRACTS_DIR = path.resolve(__dirname, '..', "contracts");
const DEPLOYED_DIR  = "solidity_utils_deployments";

const OPTIMIZER_SETTINGS =
    {
    enabled: true,
    runs:    2,
    details:
        {
        peephole:          true,
        jumpdestRemover:   true,
        orderLiterals:     true,
        deduplicate:       true,
        cse:               true,
        constantOptimizer: true,
        yul:               true
        }
    };

const TYPESCRIPT_LOADER_PART_1 =
`import { default as Web3 } from "web3";
import { Contract        } from "web3-eth-contract";

const CONTRACT_ADDRESS = "`;
const TYPESCRIPT_LOADER_PART_2 =
`";
const CONTRACT_ABI     = JSON.parse(\``;
const TYPESCRIPT_LOADER_PART_3 =
`\`);

function loader(web3 : Web3) : Contract
    {
    return new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
    }
export default loader;
`;

const LOADER_INFO_PART_1 =
`const CONTRACT_ADDRESS = "`;
const LOADER_INFO_PART_2 =
`";
const CONTRACT_ABI     = \``;
const LOADER_INFO_PART_3 =
`\`;

const INFO =
    {
    address: CONTRACT_ADDRESS,
    abiJson: CONTRACT_ABI
    };
export default INFO;
`;

const JSON_INFO_PART_1 =
`{
"address": "`;
const JSON_INFO_PART_2 =
`",
"abiStr":  "`;
const JSON_INFO_PART_3 =
`",
"abi":     `;
const JSON_INFO_PART_4 =
`
}`;



/**
 * Utilities for compiling and deploying solidity.
 */
export class SolidityUtils
    {
    public source      : string              = "";
    public allSoucres  : Map<string, string> = new Map<string, string>();
    public hadErrors   : boolean             = true;
    public solcResult  : any                 = null;
    public bytecodeHex : string              = "";
    public abiObj      : any                 = null;

    /**
     * A static method to compile and deploy a contract from its solidity source.
     * The Contract object returned is ready for use (e.g. <returned object>.methods.mint(accounts[1], BigInt("1000")).send({ from: accounts[0], gas: 500000 })).
     * It can also optionally keep a record of the source deployed (including imports), the compilation result, the deployemtent addres, etc.
     * 
     * @param contractFile         A solidity source file containing 1 contract (e.g. "mrxerc20.sol"), assumed to be in the contracts subdirectory.
     * @param web3                 The blockchain API to use.
     * @param accountIndex         The index of the web3 provided account to use for deployment.
     * @param constructorArguments An array containg the parameters for the contract's contructor.
     * @param gas                  The gas allowance for the deployment transaction in wei.
     * @param saveResultDir        Optional: The name for a record keeping directory in which to save a copy of the Solidity source, solc result, abi, etc.
     * @param metadata             An object to be saved in the metadata.json file created in the record keeping directory.
     * @returns                    An object of type "web3-eth-contract".Contract representing the deployed contract.
     */
    public static async deployFromSource(contractFile : string, web3 : Web3, accountIndex : number, constructorArguments : any[], gas : number, saveResultDir : string | null = null, metadata : any = null) : Promise<Contract>
        {
        const su = new SolidityUtils();
        if (!su.compile(contractFile)) throw new Error(`Compilation Failed ${su.source}`);
        return await su.deployThis(web3, accountIndex, constructorArguments, gas, saveResultDir, metadata);
        }

    /**
     * Saves details of an additional contract that was deployed by the contract deployed by deployFromSource().
     * 
     * @param saveResultDir The name of the record keeping directory as given to deployFromSource().
     * @param contractFile  A solidity source file containing an additional contract that was deployed by the contract deployed by deployFromSource().
     * @param address       The address of the additional contract.
     */
    public static saveAlsoDeployedContract(saveResultDir : string, contractFile : string, address : string) : void
        {
        const su = new SolidityUtils();
        if (!su.compile(contractFile)) throw new Error(`Compilation Failed ${su.source}`);
        su.saveDeploymentDetails(saveResultDir, address)
        }

    /**
     * A static method to compile and deploy a contract from its hex bytecode and its javascript ABI object.
     * The Contract object returned is ready for use (e.g. <returned object>.methods.mint(accounts[1], BigInt("1000")).send({ from: accounts[0], gas: 500000 })).
     * 
     * @param abiObj               A javascript (not JSON) object in standard solc output format describing the contract's interface.
     * @param bytecodeHex          A hex string containg the contract's bytecode.
     * @param web3                 The blockchain API to use.
     * @param accountIndex         The index of the web3 provided account to use for deployment.
     * @param constructorArguments An array containg the parameters for the contract's contructor.
     * @param gas                  The gas allowance for the deployment transaction in wei.
     * @returns                    An object of type "web3-eth-contract".Contract representing the deployed contract.
     */
    public static async deployRaw(abiObj : any, bytecodeHex : string, web3 : Web3, accountIndex : number, constructorArguments : any[], gas : number) : Promise<Contract>
        {
        const su = new SolidityUtils();
        su.source = "< bytecode & abi from SolidityUtils.deployRaw() >";
        su.abiObj = abiObj;
        su.bytecodeHex = bytecodeHex;
        su.hadErrors = false;
        return await su.deployThis(web3, accountIndex, constructorArguments, gas, null, null);
        }

    private async deployThis(web3 : Web3, accountIndex : number, constructorArguments : any[], gas : number, saveResultDir : string | null, inputMetadata : any, contractFiles : string[] | null = null) : Promise<Contract>
        {
        if (this.hadErrors) throw new Error(this.source != "" ? "Deployment failed because of compilation errors." : "Deployment failed because nothing's been compiled.");
        console.log(`DEPLOYER : DEPLOYING ${this.source}`);
        if (inputMetadata)
            {
            if (inputMetadata.deploymentUrl) console.log(`DEPLOYER :     DEPLOYMENT URL ${inputMetadata.deploymentUrl}`);
            }
        else
            inputMetadata = null;
        const accounts = await web3.eth.getAccounts();
        const acnt = accounts[accountIndex];
        console.log(`DEPLOYER :     DEPLOYMENT ACCOUNT ${acnt}`);
        const c = await new web3.eth.Contract(this.abiObj).deploy({ data: this.bytecodeHex, arguments: constructorArguments }).send({ from: acnt, gas: gas });
        console.log(`DEPLOYER :     ${this.source} SUCCESSFULLY DEPLOYED AT ADDRESS ${c.options.address}`);
        if (saveResultDir != null && saveResultDir != "") this.saveThisDeployment(saveResultDir, constructorArguments, acnt, c, inputMetadata);
        return c;
        }

    private saveThisDeployment(saveResultDir : string, constructorArguments : any[], acnt : string, c : Contract, inputMetadata : any) : void
        {
        let outputDir = this.resolveDir(saveResultDir);
        fs.removeSync(outputDir);
        console.log(`DEPLOYER : SAVING DEPLOYMENT IN ${outputDir}`);
        const srcDir = path.resolve(outputDir, "src");
        fs.ensureDirSync(srcDir);
        const it = this.allSoucres.entries();
        for (let r = it.next(); !r.done; r = it.next())
            {
            const file = r.value[0];
            const destinationPath = path.resolve(srcDir, file);
            console.log(`DEPLOYER :     SAVING SOLIDITY SOURCE ${file}  -->  ${destinationPath}`);
            fs.copySync(r.value[1], destinationPath);
            }
        const metadata =
            {
            whenProcessed:        new Date().toUTCString(),
            hadErrors:            this.hadErrors,
            contractFile:         this.source,
            constructorArguments: constructorArguments,
            deploymentAccount:    acnt,
            inputMetadata:        inputMetadata
            };
        const mdFile = path.resolve(outputDir, "metadata.json");
        console.log(`DEPLOYER :     SAVING METADATA JSON metadata.json  -->  ${mdFile}`);
        fs.outputJsonSync(mdFile, metadata);
        this.saveDeploymentDetails(saveResultDir, c.options.address);
        }

    private saveDeploymentDetails(saveResultDir : string, address : string) : void
        {
        const name = this.source.split(".")[0];
        saveResultDir = path.resolve(this.resolveDir(saveResultDir), name);
        fs.ensureDirSync(saveResultDir);
        const solcResultFile = path.resolve(saveResultDir, "solcresult.json");
        console.log(`DEPLOYER :     SAVING ${name} SOLC RESULT JSON solcresult.json  -->  ${solcResultFile}`);
        fs.outputJsonSync(solcResultFile, this.solcResult);
        const abiFile = path.resolve(saveResultDir, "abi.json");
        console.log(`DEPLOYER :     SAVING ${name} ABI JSON abi.json  -->  ${abiFile}`);
        fs.outputJsonSync(abiFile, this.abiObj);
        const bytecodeFile = path.resolve(saveResultDir, "bytecode.hex");
        console.log(`DEPLOYER :     SAVING ${name} BYTECODE HEX bytecode.hex  -->  ${bytecodeFile}`);
        fs.writeFileSync(bytecodeFile, this.bytecodeHex);
        const loaderFuncFile = path.resolve(saveResultDir, "loaderfunction.ts");
        console.log(`DEPLOYER :     SAVING ${name} TYPESCRIPT LOADER FUNCTION loaderfunction.ts  -->  ${loaderFuncFile}`);
        const abiStr = JSON.stringify(this.abiObj);
        fs.writeFileSync(loaderFuncFile, TYPESCRIPT_LOADER_PART_1 + address + TYPESCRIPT_LOADER_PART_2 + abiStr + TYPESCRIPT_LOADER_PART_3);
        const loaderInfoFile = path.resolve(saveResultDir, "loaderinfo.ts");
        console.log(`DEPLOYER :     SAVING ${name} TYPESCRIPT LOADER INFO OBJECT loaderinfo.ts  -->  ${loaderInfoFile}`);
        fs.writeFileSync(loaderInfoFile, LOADER_INFO_PART_1 + address + LOADER_INFO_PART_2 + abiStr + LOADER_INFO_PART_3);
        const jsonInfoFile = path.resolve(saveResultDir, "loaderinfo.json");
        console.log(`DEPLOYER :     SAVING ${name} JSON LOADER INFO loaderinfo.json  -->  ${jsonInfoFile}`);
        fs.writeFileSync(jsonInfoFile, JSON_INFO_PART_1 + address + JSON_INFO_PART_2 + abiStr.replace(new RegExp("\"", "g"), "\\\"") + JSON_INFO_PART_3 + abiStr + JSON_INFO_PART_4);
        }

    private resolveDir(dir : string) : string
        {
        let folders = dir.split("/");
        if (folders.length == 1) folders = dir.split("\\");
        let outputDir = path.resolve(__dirname, '..', DEPLOYED_DIR);
        for (const f of folders) outputDir = path.resolve(outputDir, f);
        return outputDir;
        }

    /**
     * Compile a solidity contract.
     * The result's are NOT saved on disk, but instead are available as the following properties of the SolidityUtils object:
     * 
     * .source      The source file which was compiled.
     * .allSoucres  A map containg the compiled file and all imports, mapping each file name to its full pathname.
     * .hadErrors   True if there were compilation errors, false otherwise.
     * .solcResult  What solc.compile() returned, as a javascript object.
     * .bytecodeHex A hex string containg the compiled contract's bytecode.
     * .abiObj      A javascript object containg the compiled contract's ABI.
     * 
     * @param sourceFile The solidity source file containg the contract to compile (e.g. "mrxerc20.sol"), assumed to be in the contracts subdirectory.
     * @returns          True if the compilation succeeded, false otherwise.
     */
    public compile(sourceFile : string) : boolean
        {
        this.source = "";
        this.allSoucres.clear();
        this.hadErrors = true;
        this.solcResult = null;
        this.bytecodeHex = "";
        this.abiObj = null;
        try
            {
            const sourcePath = path.resolve(__dirname, '..' , CONTRACTS_DIR, sourceFile);
            this.source = sourceFile;
            this.allSoucres.set(sourceFile, sourcePath);
            console.log(`CALLSOLC : COMPILING ${sourceFile}  -->  ${sourcePath}`)
            let input : any = { };
            input["language"] = "Solidity";
            input["sources"] = { };
            input["sources"][sourceFile] = { content: fs.readFileSync(sourcePath, "utf8") };
            input["settings"] = { };
            input["settings"]["optimizer"] = OPTIMIZER_SETTINGS;
            input["settings"]["outputSelection"] = { };
            input["settings"]["outputSelection"][sourceFile] = { };
            input["settings"]["outputSelection"][sourceFile]["*"] = [ "abi", "evm.bytecode.object" ];
            this.solcResult = JSON.parse(solc.compile(JSON.stringify(input),
                {
                import: (importFile : string) : any =>
                    {
                    const importPath = path.resolve(__dirname, '..', CONTRACTS_DIR, importFile);
                    console.log(`CALLSOLC :     IMPORTING ${importFile}  -->  ${importPath}`);
                    this.allSoucres.set(importFile, importPath);
                    return { contents: fs.readFileSync(importPath, "utf8") };
                    }
                }));
            const contractResult = this.solcResult.contracts[sourceFile][Object.keys(this.solcResult.contracts[sourceFile])[0]];
            this.bytecodeHex = contractResult.evm.bytecode.object;
            this.abiObj = contractResult.abi;
            }
        catch (e)
            {
            if (this.solcResult)
                {
                console.log(`CALLSOLC : ERROR COMPILATION FAILED ${sourceFile} DUMPING SOLC RESULT`);
                for (const line of JSON.stringify(this.solcResult).split("\\n")) console.log(line);
                console.log(`CALLSOLC : END SOLC RESULT DUMP`);
                }
            else
                {
                console.log(`CALLSOLC : ERROR COMPILATION FAILED ${sourceFile} DUMPING ERROR`);
                console.log(e);
                console.log(`CALLSOLC : END SOLC ERROR DUMP`);
                }
            return false;
            }
        this.hadErrors = false;
        console.log(`CALLSOLC : COMPILED OK ${sourceFile}`)
        return true;
        }

    public dump(excludeSolcOutput : boolean = true) : void
        {
        if (this.source == "")
            console.log(`NO COMPILATION`);
        else
            {
            console.log(`COMPILATION RESULT ${this.source}`);
            if (this.hadErrors)
                console.log(`ERROR ERROR ERROR Compilation errors occured`);
            else
                {
                console.log(`BYTECODE`);
                console.log(this.bytecodeHex);
                console.log(`ABI`);
                console.log(JSON.stringify(this.abiObj));
                }
            if (this.hadErrors || !excludeSolcOutput)
                {
                if (this.solcResult)
                    {
                    console.log(`SOLC OUTPUT`);
                    for (const line of JSON.stringify(this.solcResult).split("\\n")) console.log(line);
                    }
                else
                    console.log("NO SOLC OUTPUT AVAILABLE");
                }
            console.log(`END COMPILATION RESULT`);
            }
        }
    }
