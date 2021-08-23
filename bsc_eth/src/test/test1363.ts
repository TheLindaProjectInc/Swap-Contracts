import { default as Web3             } from "web3";
import { Contract                    } from "web3-eth-contract";
import { default as HDWalletProvider } from "@truffle/hdwallet-provider";
import { MessageHashUtils            } from "../messagehashutils";
import { default as waLoader         } from "../../solidity_utils_deployments/Armilla/eth/wrappedasset/loaderfunction";
import { default as vrLoader         } from "../../solidity_utils_deployments/Armilla/eth/vendorregistry/loaderfunction";
import { default as receiverLoader   } from "../../solidity_utils_deployments/test_Armilla/eth/receiver/test_receiver/loaderfunction";
import { default as spenderLoader    } from "../../solidity_utils_deployments/test_Armilla/eth/spender/test_spender/loaderfunction";



const PASSWORD            = "xxxxxxxxxxxxxx";
const VENDOR_PRIVATE_KEY  = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const MANAGER_PRIVATE_KEY = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const VENDOR_ADDRESS      = "0xC92c8f8c6C598D6D9fcF71450fb7b416424bf959";
const MANAGER_ADDRESS     = "0xFa677457aD5E348831B11d5CA2A9eb51BFC82B84";
// const URL                 = "https://data-seed-prebsc-1-s1.binance.org:8545";
const URL                 = "https://ropsten.infura.io/v3/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const VENDOR_WEB3         = new Web3(new HDWalletProvider({ providerOrUrl: URL, privateKeys: [ VENDOR_PRIVATE_KEY ] }));
const MANAGER_WEB3        = new Web3(new HDWalletProvider({ providerOrUrl: URL, privateKeys: [ MANAGER_PRIVATE_KEY ] }));
const MRX_ADDRESS         = "0x76b5bfb7a234a5aed53fb5f91efe5ca77f618601";
const NONCE               = "0x0000000000000000000000000000000000000002";



let waManager : Contract;
let vrManager : Contract;
let waVendor  : Contract;
let vrVendor  : Contract;
let receiver  : Contract;
let spender   : Contract;



async function test() : Promise<void>
    {
    const waAddress = await vrManager.methods.getWrappedAsset().call();
    console.log(`ERC20 addr should be ${waManager.options.address}, getWrappedAsset()   reports ${waAddress}`);
    const vrAddress = await waVendor.methods.getVendorRegistry().call();
    console.log(`VR    addr should be ${vrManager.options.address}, getVendorRegistry() reports ${vrAddress}`);
    const supply = await waVendor.methods.totalSupply().call();
    console.log(`      totalSupply() reports ${supply}`);
    //await registerAndMint();
    await test1363();
    }

async function test1363() : Promise<void>
    {
    console.log("");
    console.log("**********   transferAndCall()   **********");
    await dumpReceiver();
    await waVendor.methods.transferAndCall(receiver.options.address, "10", "0x12345678").send({ from: VENDOR_ADDRESS, gas: 500000 });
    await dumpReceiver();
    console.log("");
    console.log("**********   approveAndCall()   **********");
    await dumpSpender();
    await waVendor.methods.approveAndCall(spender.options.address, "30", "0x87655678").send({ from: VENDOR_ADDRESS, gas: 500000 });
    await dumpSpender();
    console.log("");
    console.log("**********   transferFromAndCall()   **********");
    await waVendor.methods.approve(MANAGER_ADDRESS, "30").send({ from: VENDOR_ADDRESS, gas: 500000 });
    await dumpReceiver();
    await waManager.methods.transferFromAndCall(VENDOR_ADDRESS, receiver.options.address, "15", "0xcafebabe").send({ from: MANAGER_ADDRESS, gas: 500000 });
    await dumpReceiver();
    }

async function dumpReceiver() : Promise<void>
    {
    let data = await waManager.methods.balanceOf(VENDOR_ADDRESS).call();
    console.log(`vendor balance is  ${data}.`);
    data = await receiver.methods.lastOperatorSeen().call();
    console.log(`lastOperatorSeen() returns ${data}`);
    data = await receiver.methods.lastFromSeen().call();
    console.log(`lastFromSeen()     returns ${data}`);
    data = await receiver.methods.lastValueSeen().call();
    console.log(`lastValueSeen()    returns ${data}`);
    data = await receiver.methods.lastDataSeen().call();
    console.log(`lastDataSeen()     returns ${data}`);      
    }

async function dumpSpender() : Promise<void>
    {
    let data = await waManager.methods.balanceOf(VENDOR_ADDRESS).call();
    console.log(`vendor balance is  ${data}.`);
    data = await spender.methods.lastOwnerSeen().call();
    console.log(`lastOwnerSeen()    returns ${data}`);
    data = await spender.methods.lastValueSeen().call();
    console.log(`lastValueSeen()    returns ${data}`);
    data = await spender.methods.lastDataSeen().call();
    console.log(`lastDataSeen()     returns ${data}`);      
    }

async function registerAndMint() : Promise<void>
    {
    let hash = MessageHashUtils.hashRegistrationMessage(VENDOR_ADDRESS, MRX_ADDRESS, vrManager.options.address);
    let signature = await MANAGER_WEB3.eth.personal.sign(hash, MANAGER_ADDRESS, PASSWORD);
    console.log(`Signed`);
    console.log(signature);
    await vrVendor.methods.registerAsVendor(MRX_ADDRESS, signature).send({ from: VENDOR_ADDRESS, gas: 500000 });
    console.log(`Registered.`);
    const isRegistered = await vrManager.methods.isRegistered(MRX_ADDRESS).call();
    console.log(`isRegistered says ${isRegistered}`);

    hash = MessageHashUtils.hashMintMessage(VENDOR_ADDRESS, "10000", waManager.options.address, NONCE);
    signature = await MANAGER_WEB3.eth.personal.sign(hash, MANAGER_ADDRESS, PASSWORD);
    console.log(`Signed`);
    console.log(signature);
    await waVendor.methods.vendorMint("10000", NONCE, signature).send({ from: VENDOR_ADDRESS, gas: 500000 });
    console.log(`Minted.`);
    const bal = await waManager.methods.balanceOf(VENDOR_ADDRESS).call();
    console.log(`balanceOf() says ${bal}.`);
    }

function init() : void
    {
    waManager = waLoader(MANAGER_WEB3);
    vrManager = vrLoader(MANAGER_WEB3);
    waVendor = waLoader(VENDOR_WEB3);
    vrVendor = vrLoader(VENDOR_WEB3);
    receiver = receiverLoader(VENDOR_WEB3);
    spender = spenderLoader(VENDOR_WEB3);
    }

async function run() : Promise<void>
    {
    console.log(`Starting`);
    try
        {
        init();
        await test();
        }
    catch (e)
        {
        console.log(`ERROR!`);
        console.log(e);
        }
    }

run().then(() =>
    {
    console.log(`Finished`);
    process.exit();
    });
