import   assert            from "assert";
import { default as Web3 } from "web3";
import { Contract        } from "web3-eth-contract";
const    ganache           = require("ganache-cli");
import { SolidityUtils    } from "../solidityutils";
import { MessageHashUtils } from "../messagehashutils";



const MNEMONIC      = "reward thing giraffe produce jealous course shrug identify armor suit table inmate honey genre leg"; // This nmemonic is ONLY used for test purposes.
const ZERO_ADDRESS  = "0x0000000000000000000000000000000000000000";
const MRX_ADDRESSES =
    [
    "0x1000000000000000000000000000000000000001",
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
    "0x3333333333333333333333333333333333333333",
    "0x4444444444444444444444444444444444444444",
    "0x5555555555555555555555555555555555555555",
    "0x6666666666666666666666666666666666666666",
    "0x7777777777777777777777777777777777777777",
    "0x8888888888888888888888888888888888888888",
    "0x9999999999999999999999999999999999999999"
    ];
const PRIVATE_KEYS =
    [
    "0x14a5d0894188e0822d16d6c3801e5fac9f651dbd3da6ef1923e1352075f27965",
    "0x3bf9ec22a6bae747594ad98c726fbf32fc9649155998d580993ce8bd7630bd7a",
    "0x4b19b90980f56694e1e9f65593e90205e5900a50e01d352fbbd7ca2272ee0e29",
    "0x7ee0dc568934dfa0f89dd6c59e0b3cad9aaae5ec75a38a5d9b8f293e8c883b28",
    "0x2c6e528c8827e0c7ac7dd72da18070ab7b1649c43e4d18e4f6a196d705672413",
    "0xb4eb679672578d66e775396469a946e3577580fcfab844df6815342e42d6b7fb",
    "0x398b71676c83ebba609132e267a77b77270aadd0ebc1b5544b9dbe8cf930be7a",
    "0xdfd52d39868cb8184ecb5ae876a4e027cfab32af60ec148017219c1858f2ec77",
    "0x69a591f4dd5be9579a9d12906bc8348d83569a35fe738e757fc0addf742f00a8",
    "0x55b4e18f9e6d68ec0d0e5b3696fe3967a11195ddedd3cffa7918bb891fc89454"
    ];



let web3      : Web3;
let accounts  : string[];

let wa        : Contract;
let vr        : Contract;
let receiver  : Contract;
let spender   : Contract;

let snapshotA : number;
let snapshotB : number;
let snapshotC : number;
let snapshotD : number;
let snapshotE : number;



async function deploy(cap : string) : Promise<void>
    {
    vr = await SolidityUtils.deployFromSource("vendorregistry.sol", web3, 0, [ "Metrix", "MRX", cap, 1 ], 6000000);
    const waAddress = await vr.methods.getWrappedAsset().call();
    const su = new SolidityUtils();
    assert.ok(su.compile("wrappedasset.sol"));
    const waAbi = su.abiObj;
    wa = new web3.eth.Contract(waAbi, waAddress);
    }


before(async () : Promise<void> =>
    {
    web3 = new Web3(ganache.provider({ mnemonic: MNEMONIC, locked: false }));
    accounts = await web3.eth.getAccounts();
    });



describe("VendorRegistry & WrappedAsset", () : void =>
    {

    it("deploys the contracts", async () : Promise<void> =>
        {
        await deploy("10000000000000000000000");
        assert.ok(vr.options.address);
        assert.ok(wa.options.address);
        });

    it("is now testing VendorRegistry", () : void =>
        {
        console.log();
        console.log("VENDOR   REGISTRY");
        console.log("=================");
        console.log();
        });

    it("fails to register account 1 when a non-manager signs the registration message", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            const hash = MessageHashUtils.hashRegistrationMessage(accounts[1], MRX_ADDRESSES[1], vr.options.address);
            const sigInfo = web3.eth.accounts.sign(hash, PRIVATE_KEYS[1]);
            await vr.methods.registerAsVendor(MRX_ADDRESSES[1], sigInfo.signature).send({ from: accounts[1], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      registerAsVendor error message is: " + e.message);
            }
        assert.ok(sawError);
        });

    it("registers account 1", async () : Promise<void> =>
        {
        const hash = MessageHashUtils.hashRegistrationMessage(accounts[1], MRX_ADDRESSES[1], vr.options.address);
        const sigInfo = web3.eth.accounts.sign(hash, PRIVATE_KEYS[0]);
        await vr.methods.registerAsVendor(MRX_ADDRESSES[1], sigInfo.signature).send({ from: accounts[1], gas: 500000 });
        });

    it("registered account 1 correctly", async () : Promise<void> =>
        {
        const mrxAddress = await vr.methods.findMrxFromVendor(accounts[1]).call();
        assert.ok(mrxAddress == MRX_ADDRESSES[1]);
        const ethAddress = await vr.methods.findVendorFromMrx(MRX_ADDRESSES[1]).call();
        assert.ok(ethAddress == accounts[1]);
        const registeredOK = await vr.methods.isRegistered(MRX_ADDRESSES[1]).call();
        assert.ok(registeredOK);
        });

    it("fails to register account 1 a second time over", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            const hash = MessageHashUtils.hashRegistrationMessage(accounts[1], MRX_ADDRESSES[1], vr.options.address);
            const sigInfo = web3.eth.accounts.sign(hash, PRIVATE_KEYS[0]);
            await vr.methods.registerAsVendor(MRX_ADDRESSES[1], sigInfo.signature).send({ from: accounts[1], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      registerAsVendor error message is: " + e.message);
            }
        assert.ok(sawError);
        });

    it("fails to register account 2 with the same MRX address as account 1", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            const hash = MessageHashUtils.hashRegistrationMessage(accounts[2], MRX_ADDRESSES[1], vr.options.address);
            const sigInfo = web3.eth.accounts.sign(hash, PRIVATE_KEYS[0]);
            await vr.methods.registerAsVendor(MRX_ADDRESSES[1], sigInfo.signature).send({ from: accounts[2], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      registerAsVendor error message is: " + e.message);
            }
        assert.ok(sawError);
        });

    it("registers account 2", async () : Promise<void> =>
        {
        const hash = MessageHashUtils.hashRegistrationMessage(accounts[2], MRX_ADDRESSES[2], vr.options.address);
        const sigInfo = web3.eth.accounts.sign(hash, PRIVATE_KEYS[0]);
        await vr.methods.registerAsVendor(MRX_ADDRESSES[2], sigInfo.signature).send({ from: accounts[2], gas: 500000 });
        });

    it("registered account 2 correctly", async () : Promise<void> =>
        {
        const mrxAddress = await vr.methods.findMrxFromVendor(accounts[2]).call();
        assert.ok(mrxAddress == MRX_ADDRESSES[2]);
        const ethAddress = await vr.methods.findVendorFromMrx(MRX_ADDRESSES[2]).call();
        assert.ok(ethAddress == accounts[2]);
        const registeredOK = await vr.methods.isRegistered(MRX_ADDRESSES[2]).call();
        assert.ok(registeredOK);
        });

    it("pauses the VendorRegistry", async () : Promise<void> =>
        {
        let paused = await vr.methods.paused().call();
        assert.ok(!paused);
        await vr.methods.pause().send({ from: accounts[0], gas: 500000 });
        paused = await vr.methods.paused().call();
        assert.ok(paused);
        });

    it("fails to register account 3 while VendorRegistry is paused", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            const hash = MessageHashUtils.hashRegistrationMessage(accounts[3], MRX_ADDRESSES[3], vr.options.address);
            const sigInfo = web3.eth.accounts.sign(hash, PRIVATE_KEYS[0]);
            await vr.methods.registerAsVendor(MRX_ADDRESSES[3], sigInfo.signature).send({ from: accounts[3], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      registerAsVendor error message is: " + e.message);
            }
        assert.ok(sawError);
        });

    it("unpauses the VendorRegistry", async () : Promise<void> =>
        {
        let paused = await vr.methods.paused().call();
        assert.ok(paused);
        await vr.methods.unpause().send({ from: accounts[0], gas: 500000 });
        paused = await vr.methods.paused().call();
        assert.ok(!paused);
        });

    it("registers account 3", async () : Promise<void> =>
        {
        const hash = MessageHashUtils.hashRegistrationMessage(accounts[3], MRX_ADDRESSES[3], vr.options.address);
        const sigInfo = web3.eth.accounts.sign(hash, PRIVATE_KEYS[0]);
        await vr.methods.registerAsVendor(MRX_ADDRESSES[3], sigInfo.signature).send({ from: accounts[3], gas: 500000 });
        });

    it("registered account 3 correctly", async () : Promise<void> =>
        {
        const mrxAddress = await vr.methods.findMrxFromVendor(accounts[3]).call();
        assert.ok(mrxAddress == MRX_ADDRESSES[3]);
        const ethAddress = await vr.methods.findVendorFromMrx(MRX_ADDRESSES[3]).call();
        assert.ok(ethAddress == accounts[3]);
        const registeredOK = await vr.methods.isRegistered(MRX_ADDRESSES[3]).call();
        assert.ok(registeredOK);
        });

    it("fails to update account 2's MRX address to an already in use MRX address", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            await vr.methods.setVendorRegistration(MRX_ADDRESSES[3], accounts[2]).send({ from: accounts[0], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      setVendorRegistration error message is: " + e.message);
            }
        assert.ok(sawError);
        });

    it("fails to update account 2's MRX address when a non manager tries to do it", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            await vr.methods.setVendorRegistration(MRX_ADDRESSES[4], accounts[2]).send({ from: accounts[1], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      setVendorRegistration error message is: " + e.message);
            }
        assert.ok(sawError);
        });

    it("updates account 2's MRX address", async () : Promise<void> =>
        {
        await vr.methods.setVendorRegistration(MRX_ADDRESSES[4], accounts[2]).send({ from: accounts[0], gas: 500000 });
        const mrxAddress = await vr.methods.findMrxFromVendor(accounts[2]).call();
        assert.ok(mrxAddress == MRX_ADDRESSES[4]);
        const ethAddress = await vr.methods.findVendorFromMrx(MRX_ADDRESSES[4]).call();
        assert.ok(ethAddress == accounts[2]);
        let registeredOK = await vr.methods.isRegistered(MRX_ADDRESSES[4]).call();
        assert.ok(registeredOK);
        registeredOK = await vr.methods.isRegistered(MRX_ADDRESSES[2]).call();
        assert.ok(!registeredOK);
        });

    it("restores account 2's previous MRX address", async () : Promise<void> =>
        {
        await vr.methods.setVendorRegistration(MRX_ADDRESSES[2], accounts[2]).send({ from: accounts[0], gas: 500000 });
        const mrxAddress = await vr.methods.findMrxFromVendor(accounts[2]).call();
        assert.ok(mrxAddress == MRX_ADDRESSES[2]);
        const ethAddress = await vr.methods.findVendorFromMrx(MRX_ADDRESSES[2]).call();
        assert.ok(ethAddress == accounts[2]);
        let registeredOK = await vr.methods.isRegistered(MRX_ADDRESSES[2]).call();
        assert.ok(registeredOK);
        registeredOK = await vr.methods.isRegistered(MRX_ADDRESSES[4]).call();
        assert.ok(!registeredOK);
        });

    it("uses setVendorRegistration to register account 4", async () : Promise<void> =>
        {
        await vr.methods.setVendorRegistration(MRX_ADDRESSES[4], accounts[4]).send({ from: accounts[0], gas: 500000 });
        });

    it("registered account 4 correctly", async () : Promise<void> =>
        {
        const mrxAddress = await vr.methods.findMrxFromVendor(accounts[4]).call();
        assert.ok(mrxAddress == MRX_ADDRESSES[4]);
        const ethAddress = await vr.methods.findVendorFromMrx(MRX_ADDRESSES[4]).call();
        assert.ok(ethAddress == accounts[4]);
        const registeredOK = await vr.methods.isRegistered(MRX_ADDRESSES[4]).call();
        assert.ok(registeredOK);
        });

    it("is now testing WrappedAsset", () : void =>
        {
        console.log();
        console.log("WRAPPED   ASSET");
        console.log("===============");
        console.log();
        });

    it("is called Metrix", async () : Promise<void> =>
        {
        const name = await wa.methods.name().call();
        assert.ok("Metrix" == name);
        });

    it("has the symbol MRX", async () : Promise<void> =>
        {
        const symbol = await wa.methods.symbol().call();
        assert.ok("MRX" == symbol);
        });

    it("has 8 digits to the right of the decimal point", async () : Promise<void> =>
        {
        const decimals = await wa.methods.decimals().call();
        assert.ok(8 == decimals);
        });

    it("has a cap of 10000000000000000000000", async () : Promise<void> =>
        {
        const cap = await wa.methods.cap().call();
        assert.ok(BigInt("10000000000000000000000") == cap);
        });

    it("has an initial total supply of 0", async () : Promise<void> =>
        {
        const totalSupply = await wa.methods.totalSupply().call();
        assert.ok(0 == totalSupply);
        });

    it("has a balance of 0 in account 1", async () : Promise<void> =>
        {
        const bal1 = await wa.methods.balanceOf(accounts[1]).call();
        assert.ok(0 == bal1);
        });

    it("fails to mint 100000000000000000000000 into account 2 because it's too much", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            const hash = MessageHashUtils.hashMintMessage(accounts[2], "100000000000000000000000", wa.options.address, MRX_ADDRESSES[0]);
            const sigInfo = web3.eth.accounts.sign(hash, PRIVATE_KEYS[0]);
            await wa.methods.vendorMint("100000000000000000000000", MRX_ADDRESSES[0], sigInfo.signature).send({ from: accounts[2], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      vendorMint error message is: " + e.message);
            }
        assert.ok(sawError);
        const bal = await wa.methods.balanceOf(accounts[2]).call();
        assert.ok(0 == bal);
        });

    it("fails to mint 1000 into account 1 because it was signed by a non manager", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            const hash = MessageHashUtils.hashMintMessage(accounts[1], "1000", wa.options.address, MRX_ADDRESSES[0]);
            const sigInfo = web3.eth.accounts.sign(hash, PRIVATE_KEYS[3]);
            await wa.methods.vendorMint("1000", MRX_ADDRESSES[0], sigInfo.signature).send({ from: accounts[1], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      vendorMint error message is: " + e.message);
            }
        assert.ok(sawError);
        const bal = await wa.methods.balanceOf(accounts[1]).call();
        assert.ok(0 == bal);
        });

    it("takes snapshot A", async () : Promise<void> =>
        {
        const txResult = await wa.methods.takeSnapshot().send({ from: accounts[0], gas: 500000 });
        assert.ok(txResult.events.SnapshotInfo.returnValues.snapshotId);
        snapshotA = txResult.events.SnapshotInfo.returnValues.snapshotId;
        const id = await wa.methods.getCurrentSnapshotId().call();
        assert.ok(snapshotA == id);
        });

    it("fails to mint 1000 into account 5 because it's not registered", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            const hash = MessageHashUtils.hashMintMessage(accounts[5], "1000", wa.options.address, MRX_ADDRESSES[0]);
            const sigInfo = web3.eth.accounts.sign(hash, PRIVATE_KEYS[0]);
            await wa.methods.vendorMint("1000", MRX_ADDRESSES[0], sigInfo.signature).send({ from: accounts[5], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      vendorMint error message is: " + e.message);
            }
        assert.ok(sawError);
        const bal = await wa.methods.balanceOf(accounts[5]).call();
        assert.ok(0 == bal);
        });

    it("fails to mint 1000 into account 1 because the nonce parameter's different to the nonce in the signature", async () : Promise<void> =>
        {
        const balBefore = await wa.methods.balanceOf(accounts[1]).call();
        let sawError = false;
        try
            {
            const hash = MessageHashUtils.hashMintMessage(accounts[1], "1000", wa.options.address, MRX_ADDRESSES[0]);
            const sigInfo = web3.eth.accounts.sign(hash, PRIVATE_KEYS[0]);
            await wa.methods.vendorMint("1000", MRX_ADDRESSES[1], sigInfo.signature).send({ from: accounts[1], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      vendorMint error message is: " + e.message);
            }
        assert.ok(sawError);
        const balAfter = await wa.methods.balanceOf(accounts[1]).call();
        assert.ok(balBefore == balAfter);
        });

    it("mints 1000 into account 1", async () : Promise<void> =>
        {
        const hash = MessageHashUtils.hashMintMessage(accounts[1], "1000", wa.options.address, MRX_ADDRESSES[0]);
        const sigInfo = web3.eth.accounts.sign(hash, PRIVATE_KEYS[0]);
        const txResult = await wa.methods.vendorMint("1000", MRX_ADDRESSES[0], sigInfo.signature).send({ from: accounts[1], gas: 500000 });
        assert.ok(txResult.events.Transfer.returnValues.from == ZERO_ADDRESS);
        assert.ok(txResult.events.Transfer.returnValues.to == accounts[1]);
        assert.ok(txResult.events.Transfer.returnValues.value == 1000);
        });

    it("fails to mint 1000 into account 1 a second time because it's the same nonce as before", async () : Promise<void> =>
        {
        const balBefore = await wa.methods.balanceOf(accounts[1]).call();
        let sawError = false;
        try
            {
            const hash = MessageHashUtils.hashMintMessage(accounts[1], "1000", wa.options.address, MRX_ADDRESSES[0]);
            const sigInfo = web3.eth.accounts.sign(hash, PRIVATE_KEYS[0]);
            await wa.methods.vendorMint("1000", MRX_ADDRESSES[0], sigInfo.signature).send({ from: accounts[1], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      vendorMint error message is: " + e.message);
            }
        assert.ok(sawError);
        const balAfter = await wa.methods.balanceOf(accounts[1]).call();
        assert.ok(balBefore == balAfter);
        });

    it("sets account 1 as a manager", async () : Promise<void> =>
        {
        await wa.methods.setManager(accounts[1], true).send({ from: accounts[0], gas: 500000 });
        assert.ok(wa.methods.addressIsAManager(accounts[1]).call());
        });

    it("fails to take a snapshot because a non-manager tried it", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            await wa.methods.takeSnapshot().send({ from: accounts[2], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      takeSnapshot error message is: " + e.message);
            }
        assert.ok(sawError);
        });

    it("has a total supply of 1000", async () : Promise<void> =>
        {
        const totalSupply = await wa.methods.totalSupply().call();
        assert.ok(1000 == totalSupply);
        });

    it("has a balance of 1000 in account 1", async () : Promise<void> =>
        {
        const bal = await wa.methods.balanceOf(accounts[1]).call();
        assert.ok(1000 == bal);
        });

    it("takes snapshot B", async () : Promise<void> =>
        {
        const txResult = await wa.methods.takeSnapshot().send({ from: accounts[1], gas: 500000 });
        assert.ok(txResult.events.SnapshotInfo.returnValues.snapshotId);
        snapshotB = txResult.events.SnapshotInfo.returnValues.snapshotId;
        const id = await wa.methods.getCurrentSnapshotId().call();
        assert.ok(snapshotB == id);
        });

    it("fails to transfer 5000 from account 1 to account 2", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            await wa.methods.transfer(accounts[2], BigInt("5000")).send({ from: accounts[1], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      Transfer error message is: " + e.message);
            }
        assert.ok(sawError);
        const bal2 = await wa.methods.balanceOf(accounts[2]).call();
        assert.ok(0 == bal2);
        });

    it("transfers 500 from account 1 to account 2", async () : Promise<void> =>
        {
        const txResult = await wa.methods.transfer(accounts[2], BigInt("500")).send({ from: accounts[1], gas: 500000 });
        assert.ok(txResult.events.Transfer.returnValues.from == accounts[1]);
        assert.ok(txResult.events.Transfer.returnValues.to == accounts[2]);
        assert.ok(txResult.events.Transfer.returnValues.value == 500);
        });

    it("has a balance of 500 in account 1", async () : Promise<void> =>
        {
        const bal1 = await wa.methods.balanceOf(accounts[1]).call();
        assert.ok(500 == bal1);
        });

    it("has a balance of 500 in account 2", async () : Promise<void> =>
        {
        const bal2 = await wa.methods.balanceOf(accounts[2]).call();
        assert.ok(500 == bal2);
        });

    it("has a total supply of 1000", async () : Promise<void> =>
        {
        const totalSupply = await wa.methods.totalSupply().call();
        assert.ok(1000 == totalSupply);
        });

    it("takes snapshot C", async () : Promise<void> =>
        {
        const txResult = await wa.methods.takeSnapshot().send({ from: accounts[0], gas: 500000 });
        assert.ok(txResult.events.SnapshotInfo.returnValues.snapshotId);
        snapshotC = txResult.events.SnapshotInfo.returnValues.snapshotId;
        const id = await wa.methods.getCurrentSnapshotId().call();
        assert.ok(snapshotC == id);
        });

    it("fails to burn 100000000000000000000000 from account 2", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            await wa.methods.burn(BigInt("100000000000000000000000")).send({ from: accounts[2], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      Burn error message is: " + e.message);
            }
        assert.ok(sawError);
        const bal2 = await wa.methods.balanceOf(accounts[2]).call();
        assert.ok(500 == bal2);
        });

    it("burns 500 from account 2", async () : Promise<void> =>
        {
        const txResult = await wa.methods.burn(500).send({ from: accounts[2], gas: 500000 });
        assert.ok(txResult.events.Transfer.returnValues.from == accounts[2]);
        assert.ok(txResult.events.Transfer.returnValues.to == ZERO_ADDRESS);
        assert.ok(txResult.events.Transfer.returnValues.value == 500);
        });

    it("has a balance of 500 in account 1", async () : Promise<void> =>
        {
        const bal1 = await wa.methods.balanceOf(accounts[1]).call();
        assert.ok(500 == bal1);
        });

    it("has a balance of 0 in account 2", async () : Promise<void> =>
        {
        const bal2 = await wa.methods.balanceOf(accounts[2]).call();
        assert.ok(0 == bal2);
        });

    it("has a total supply of 500", async () : Promise<void> =>
        {
        const totalSupply = await wa.methods.totalSupply().call();
        assert.ok(500 == totalSupply);
        });

    it("takes snapshot D", async () : Promise<void> =>
        {
        const txResult = await wa.methods.takeSnapshot().send({ from: accounts[1], gas: 500000 });
        assert.ok(txResult.events.SnapshotInfo.returnValues.snapshotId);
        snapshotD = txResult.events.SnapshotInfo.returnValues.snapshotId;
        const id = await wa.methods.getCurrentSnapshotId().call();
        assert.ok(snapshotD == id);
        });

    it("is not currently paused", async () : Promise<void> =>
        {
        const isPaused = await wa.methods.paused().call();
        assert.ok(!isPaused);
        });

    it("changes to the paused state", async () : Promise<void> =>
        {
        await wa.methods.pause().send({ from: accounts[0], gas: 500000 });
        const isPaused = await wa.methods.paused().call();
        assert.ok(isPaused);
        });

    it("fails to mint 500 into account 2", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            const hash = MessageHashUtils.hashMintMessage(accounts[2], "500", wa.options.address, MRX_ADDRESSES[1]);
            const sigInfo = web3.eth.accounts.sign(hash, PRIVATE_KEYS[0]);
            await wa.methods.vendorMint("500", MRX_ADDRESSES[1], sigInfo.signature).send({ from: accounts[2], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      vendorMint error message is: " + e.message);
            }
        assert.ok(sawError);
        const bal2 = await wa.methods.balanceOf(accounts[2]).call();
        assert.ok(0 == bal2);
        });

    it("changes back to the unpaused state", async () : Promise<void> =>
        {
        await wa.methods.unpause().send({ from: accounts[0], gas: 500000 });
        const isPaused = await wa.methods.paused().call();
        assert.ok(!isPaused);
        });

    it("transfers 300 from account 1 to account 2", async () : Promise<void> =>
        {
        const txResult = await wa.methods.transfer(accounts[2], 300).send({ from: accounts[1], gas: 500000 });
        assert.ok(txResult.events.Transfer.returnValues.from == accounts[1]);
        assert.ok(txResult.events.Transfer.returnValues.to == accounts[2]);
        assert.ok(txResult.events.Transfer.returnValues.value == 300);
        });

    it("has a balance of 200 in account 1", async () : Promise<void> =>
        {
        const bal1 = await wa.methods.balanceOf(accounts[1]).call();
        assert.ok(200 == bal1);
        });

    it("has a balance of 300 in account 2", async () : Promise<void> =>
        {
        const bal2 = await wa.methods.balanceOf(accounts[2]).call();
        assert.ok(300 == bal2);
        });

    it("has a total supply of 500", async () : Promise<void> =>
        {
        const totalSupply = await wa.methods.totalSupply().call();
        assert.ok(500 == totalSupply);
        });

    it("takes snapshot E", async () : Promise<void> =>
        {
        const txResult = await wa.methods.takeSnapshot().send({ from: accounts[0], gas: 500000 });
        assert.ok(txResult.events.SnapshotInfo.returnValues.snapshotId);
        snapshotE = txResult.events.SnapshotInfo.returnValues.snapshotId;
        const id = await wa.methods.getCurrentSnapshotId().call();
        assert.ok(snapshotE == id);
        });

    it("has a total supply of 0 at snapshotA", async () : Promise<void> =>
        {
        const supply = await wa.methods.totalSupplyAt(snapshotA).call();
        assert.ok(0 == supply);
        });

    it("has a total supply of 1000 at snapshotB", async () : Promise<void> =>
        {
        const supply = await wa.methods.totalSupplyAt(snapshotB).call();
        assert.ok(1000 == supply);
        });

    it("has a total supply of 1000 at snapshotC", async () : Promise<void> =>
        {
        const supply = await wa.methods.totalSupplyAt(snapshotC).call();
        assert.ok(1000 == supply);
        });

    it("has a total supply of 500 at snapshotD", async () : Promise<void> =>
        {
        const supply = await wa.methods.totalSupplyAt(snapshotD).call();
        assert.ok(500 == supply);
        });

    it("has a total supply of 500 at snapshotE", async () : Promise<void> =>
        {
        const supply = await wa.methods.totalSupplyAt(snapshotE).call();
        assert.ok(500 == supply);
        });

    it("has a balance of 0 in account 1 at snapshotA", async () : Promise<void> =>
        {
        const bal1A = await wa.methods.balanceOfAt(accounts[1], snapshotA).call();
        assert.ok(0 == bal1A);
        });

    it("has a balance of 1000 in account 1 at snapshotB", async () : Promise<void> =>
        {
        const bal1B = await wa.methods.balanceOfAt(accounts[1], snapshotB).call();
        assert.ok(1000 == bal1B);
        });

    it("has a balance of 500 in account 1 at snapshotC", async () : Promise<void> =>
        {
        const bal = await wa.methods.balanceOfAt(accounts[1], snapshotC).call();
        assert.ok(500 == bal);
        });

    it("has a balance of 500 in account 1 at snapshotD", async () : Promise<void> =>
        {
        const bal = await wa.methods.balanceOfAt(accounts[1], snapshotD).call();
        assert.ok(500 == bal);
        });

    it("has a balance of 200 in account 1 at snapshotE", async () : Promise<void> =>
        {
        const bal = await wa.methods.balanceOfAt(accounts[1], snapshotE).call();
        assert.ok(200 == bal);
        });

    it("has a balance of 0 in account 2 at snapshotA", async () : Promise<void> =>
        {
        const bal1A = await wa.methods.balanceOfAt(accounts[2], snapshotA).call();
        assert.ok(0 == bal1A);
        });

    it("has a balance of 0 in account 2 at snapshotB", async () : Promise<void> =>
        {
        const bal1B = await wa.methods.balanceOfAt(accounts[2], snapshotB).call();
        assert.ok(0 == bal1B);
        });

    it("has a balance of 500 in account 2 at snapshotC", async () : Promise<void> =>
        {
        const bal = await wa.methods.balanceOfAt(accounts[2], snapshotC).call();
        assert.ok(500 == bal);
        });

    it("has a balance of 0 in account 2 at snapshotD", async () : Promise<void> =>
        {
        const bal = await wa.methods.balanceOfAt(accounts[2], snapshotD).call();
        assert.ok(0 == bal);
        });

    it("has a balance of 300 in account 2 at snapshotE", async () : Promise<void> =>
        {
        const bal = await wa.methods.balanceOfAt(accounts[2], snapshotE).call();
        assert.ok(300 == bal);
        });

    it("is now testing ERC1363 functionality", () : void =>
        {
        console.log();
        console.log("ERC1363   FUNCTIONALITY");
        console.log("=======================");
        console.log();
        });

    it("deploys the test spender and receiver contracts", async () : Promise<void> =>
        {
        receiver = await SolidityUtils.deployFromSource("test_receiver.sol", web3, 0, [ ], 6000000);
        spender = await SolidityUtils.deployFromSource("test_spender.sol", web3, 0, [ ], 6000000);
        });

    it("Test_Receiver receives a transferAndCall correctly", async () : Promise<void> =>
        {
        const value = "17";
        const data = "0x12345678";
        await wa.methods.transferAndCall(receiver.options.address, value, data).send({ from: accounts[1], gas: 500000 });
        const ok = await checkReceiver(value, data);
        assert.ok(ok);
        });

    it("Test_Spender receives an approveAndCall correctly", async () : Promise<void> =>
        {
        const value = "17";
        const data = "0x12345678";
        await wa.methods.approveAndCall(spender.options.address, value, data).send({ from: accounts[1], gas: 500000 });
        const ok = await checkSpender(value, data);
        assert.ok(ok);
        });

    it("Test_Receiver receives a transferFromAndCall correctly", async () : Promise<void> =>
        {
        const value = "23";
        const data = "0x87654321";
        await wa.methods.approve(accounts[3], value).send({ from: accounts[1], gas: 500000 });
        await wa.methods.transferFromAndCall(accounts[1], receiver.options.address, value, data).send({ from: accounts[3], gas: 500000 });
        const ok = await checkReceiver(value, data);
        assert.ok(ok);
        });

    });



async function checkReceiver(value : string, data : string) : Promise<boolean>
    {
    const lastValueSeen = await receiver.methods.lastValueSeen().call();
    const lastDataSeen = await receiver.methods.lastDataSeen().call();
    return value == lastValueSeen && data == lastDataSeen;
    }



async function checkSpender(value : string, data : string) : Promise<boolean>
    {
    const lastValueSeen = await spender.methods.lastValueSeen().call();
    const lastDataSeen = await spender.methods.lastDataSeen().call();
    return value == lastValueSeen && data == lastDataSeen;
    }



