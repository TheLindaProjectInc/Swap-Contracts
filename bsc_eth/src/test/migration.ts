import assert              from "assert";
import { default as Web3 } from "web3";
import { Contract }        from "web3-eth-contract";
const  ganache             = require("ganache-cli");
import { SolidityUtils }   from "../solidityutils";



const ZERO_ADDRESS  = "0x0000000000000000000000000000000000000000";
const MRX_ADDRESS   = "0x3333333333333333333333333333333333333333";
const MRX_ADDRESS_2 = "0x4444444444444444444444444444444444444444";

let web3      : Web3;
let accounts  : string[];
let prevWA    : Contract;
let prevVR    : Contract;
let nextWA    : Contract;
let nextVR    : Contract;



async function deploy(prevCap : string, nextCap : string) : Promise<void>
    {
    const su = new SolidityUtils();
    assert.ok(su.compile("wrappedasset.sol"));
    const waAbi = su.abiObj;
    prevVR = await SolidityUtils.deployFromSource("vendorregistry.sol", web3, 0, [ "Metrix", "MRX", prevCap, 1 ], 6000000);
    const prevWAAddress = await prevVR.methods.getWrappedAsset().call();
    prevWA = new web3.eth.Contract(waAbi, prevWAAddress);
    nextVR = await SolidityUtils.deployFromSource("vendorregistry.sol", web3, 0, [ "Metrix", "MRX", nextCap, 1 ], 6000000);
    const nextWAAddress = await nextVR.methods.getWrappedAsset().call();
    nextWA = new web3.eth.Contract(waAbi, nextWAAddress);
    }

before(async () : Promise<void> =>
    {
    console.log("MIGRATION TEST");
    console.log("==============");
    console.log();
    web3 = new Web3(ganache.provider());
    accounts = await web3.eth.getAccounts();
    await deploy("1500", "1500");
    console.log();
    console.log();
    });



describe("Migration Test", () : void =>
    {

    it("deploys the contracts", () : void =>
        {
        assert.ok(prevWA.options.address);
        assert.ok(prevVR.options.address);
        assert.ok(nextWA.options.address);
        assert.ok(nextVR.options.address);
        });

    it("is called Metrix", async () : Promise<void> =>
        {
        const name = await nextWA.methods.name().call();
        assert.ok("Metrix" == name);
        });

    it("registers PREV/0", async () : Promise<void> =>
        {
        const txResult = await prevVR.methods.setVendorRegistration(MRX_ADDRESS, accounts[0]).send({ from: accounts[0], gas: 500000 });
        assert.ok(txResult.events.Registered.returnValues.mrxAddress == MRX_ADDRESS);
        assert.ok(txResult.events.Registered.returnValues.vendorAddress == accounts[0]);
        const registeredMrxAddress = await prevVR.methods.findMrxFromVendor(accounts[0]).call();
        assert.ok(registeredMrxAddress == MRX_ADDRESS);
        });

    it("mints 1000 into PREV/0", async () : Promise<void> =>
        {
        const txResult = await prevWA.methods.mint(BigInt("1000")).send({ from: accounts[0], gas: 500000 });
        assert.ok(txResult.events.Transfer.returnValues.from == ZERO_ADDRESS);
        assert.ok(txResult.events.Transfer.returnValues.to == accounts[0]);
        assert.ok(txResult.events.Transfer.returnValues.value == 1000);
        });

    it("has a balance of 1000 in PREV/0", async () : Promise<void> =>
        {
        const bal = await prevWA.methods.balanceOf(accounts[0]).call();
        assert.ok(1000 == bal);
        });

    it("fails to migrate to NEXT/0", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            await nextWA.methods.migrateFromPreviousVersion().send({ from: accounts[0], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      migrateFromPreviousVersion() error message is: " + e.message);
            }
        assert.ok(sawError);
        const prevBal = await prevWA.methods.balanceOf(accounts[0]).call();
        assert.ok(1000 == prevBal);
        const nextBal = await nextWA.methods.balanceOf(accounts[0]).call();
        assert.ok(0 == nextBal);
        });

    it("blocks a non-owner from setting the previous version", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            await nextWA.methods.setPrevVersion(prevVR.options.address, prevWA.options.address).send({ from: accounts[1], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      setPrevVersion() error message is: " + e.message);
            }
        assert.ok(sawError);
        });

    it("sets the previous version", async () : Promise<void> =>
        {
        await nextWA.methods.setPrevVersion(prevVR.options.address, prevWA.options.address).send({ from: accounts[0], gas: 500000 });
        });

    it("still fails to migrate to NEXT/0", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            await nextWA.methods.migrateFromPreviousVersion().send({ from: accounts[0], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      migrateFromPreviousVersion() error message is: " + e.message);
            }
        assert.ok(sawError);
        const prevBal = await prevWA.methods.balanceOf(accounts[0]).call();
        assert.ok(1000 == prevBal);
        const nextBal = await nextWA.methods.balanceOf(accounts[0]).call();
        assert.ok(0 == nextBal);
        });

    it("blocks a non-owner from setting the next version", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            await prevWA.methods.setNextVersion(nextWA.options.address).send({ from: accounts[1], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      setNextVersion() error message is: " + e.message);
            }
        assert.ok(sawError);
        });

    it("sets the next version", async () : Promise<void> =>
        {
        await prevWA.methods.setNextVersion(nextWA.options.address).send({ from: accounts[0], gas: 500000 });
        });

    it("migrates 1000 to NEXT/0", async () : Promise<void> =>
        {
        await nextWA.methods.migrateFromPreviousVersion().send({ from: accounts[0], gas: 500000 });
        const prevBal = await prevWA.methods.balanceOf(accounts[0]).call();
        assert.ok(0 == prevBal);
        const nextBal = await nextWA.methods.balanceOf(accounts[0]).call();
        assert.ok(1000 == nextBal);
        });

    it("auto-registered NEXT/0", async () : Promise<void> =>
        {
        const registeredMrxAddress = await nextVR.methods.findMrxFromVendor(accounts[0]).call();
        assert.ok(registeredMrxAddress == MRX_ADDRESS);
        const registeredVendorAddress = await nextVR.methods.findVendorFromMrx(MRX_ADDRESS).call();
        assert.ok(registeredVendorAddress == accounts[0]);
        });

    it("mints 1000 into PREV/0", async () : Promise<void> =>
        {
        const txResult = await prevWA.methods.mint(BigInt("1000")).send({ from: accounts[0], gas: 500000 });
        assert.ok(txResult.events.Transfer.returnValues.from == ZERO_ADDRESS);
        assert.ok(txResult.events.Transfer.returnValues.to == accounts[0]);
        assert.ok(txResult.events.Transfer.returnValues.value == 1000);
        });

    it("has a balance of 1000 in PREV/0", async () : Promise<void> =>
        {
        const bal = await prevWA.methods.balanceOf(accounts[0]).call();
        assert.ok(1000 == bal);
        });

    it("migrates 500 to NEXT/0", async () : Promise<void> =>
        {
        await nextWA.methods.migrateFromPreviousVersion().send({ from: accounts[0], gas: 500000 });
        const prevBal = await prevWA.methods.balanceOf(accounts[0]).call();
        assert.ok(500 == prevBal);
        const nextBal = await nextWA.methods.balanceOf(accounts[0]).call();
        assert.ok(1500 == nextBal);
        });

    it("fails to call migrationBurn() directly on NEXT", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            await nextWA.methods.migrationBurn(accounts[0], BigInt("1500")).send({ from: accounts[0], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      migrationBurn() error message is: " + e.message);
            }
        assert.ok(sawError);
        });

    it("fails to call migrationBurn() directly on PREV", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            await prevWA.methods.migrationBurn(accounts[0], BigInt("1500")).send({ from: accounts[0], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      migrationBurn() error message is: " + e.message);
            }
        assert.ok(sawError);
        });

    it("fails to call migrateVendorRegistration() directly on NEXT", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            await nextVR.methods.migrateVendorRegistration(MRX_ADDRESS, accounts[0]).send({ from: accounts[0], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      migrateVendorRegistration() error message is: " + e.message);
            }
        assert.ok(sawError);
        });

    it("fails to call migrateVendorRegistration() directly on PREV", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            await prevVR.methods.migrateVendorRegistration(MRX_ADDRESS, accounts[0]).send({ from: accounts[0], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      migrateVendorRegistration() error message is: " + e.message);
            }
        assert.ok(sawError);
        });

    it("fails to link the next version a second time", async () : Promise<void> =>
        {
        let sawError = false;
        let txResult : any;
        try
            {
            txResult = await prevWA.methods.setNextVersion(nextWA.options.address).send({ from: accounts[0], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      setNextVersion() error message is: " + e.message);
            }
        assert.ok(sawError);
        });

    it("fails to link the prev version a second time", async () : Promise<void> =>
        {
        let sawError = false;
        let txResult : any;
        try
            {
            txResult = await nextWA.methods.setPrevVersion(prevVR.options.address, prevWA.options.address).send({ from: accounts[0], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      setPrevVersion() error message is: " + e.message);
            }
        assert.ok(sawError);
        });

    it("deploys the contracts again", async () : Promise<void> =>
        {
        await deploy("1500", "1500");
        });

    it("registers PREV/0", async () : Promise<void> =>
        {
        const txResult = await prevVR.methods.setVendorRegistration(MRX_ADDRESS, accounts[0]).send({ from: accounts[0], gas: 500000 });
        assert.ok(txResult.events.Registered.returnValues.mrxAddress == MRX_ADDRESS);
        assert.ok(txResult.events.Registered.returnValues.vendorAddress == accounts[0]);
        const registeredMrxAddress = await prevVR.methods.findMrxFromVendor(accounts[0]).call();
        assert.ok(registeredMrxAddress == MRX_ADDRESS);
        });

    it("registers NEXT/0", async () : Promise<void> =>
        {
        const txResult = await nextVR.methods.setVendorRegistration(MRX_ADDRESS_2, accounts[0]).send({ from: accounts[0], gas: 500000 });
        assert.ok(txResult.events.Registered.returnValues.mrxAddress == MRX_ADDRESS_2);
        assert.ok(txResult.events.Registered.returnValues.vendorAddress == accounts[0]);
        const registeredMrxAddress = await nextVR.methods.findMrxFromVendor(accounts[0]).call();
        assert.ok(registeredMrxAddress == MRX_ADDRESS_2);
        });

    it("mints 1000 into PREV/0", async () : Promise<void> =>
        {
        const txResult = await prevWA.methods.mint(BigInt("1000")).send({ from: accounts[0], gas: 500000 });
        assert.ok(txResult.events.Transfer.returnValues.from == ZERO_ADDRESS);
        assert.ok(txResult.events.Transfer.returnValues.to == accounts[0]);
        assert.ok(txResult.events.Transfer.returnValues.value == 1000);
        });

    it("has a balance of 1000 in PREV/0", async () : Promise<void> =>
        {
        const bal = await prevWA.methods.balanceOf(accounts[0]).call();
        assert.ok(1000 == bal);
        });

    it("links the next and previous versions", async () : Promise<void> =>
        {
        await nextWA.methods.setPrevVersion(prevVR.options.address, prevWA.options.address).send({ from: accounts[0], gas: 500000 });
        await prevWA.methods.setNextVersion(nextWA.options.address).send({ from: accounts[0], gas: 500000 });
        });

    it("migrates 1000 to NEXT/0", async () : Promise<void> =>
        {
        await nextWA.methods.migrateFromPreviousVersion().send({ from: accounts[0], gas: 500000 });
        const prevBal = await prevWA.methods.balanceOf(accounts[0]).call();
        assert.ok(0 == prevBal);
        const nextBal = await nextWA.methods.balanceOf(accounts[0]).call();
        assert.ok(1000 == nextBal);
        });

    it("left NEXT/0's registration unchanged", async () : Promise<void> =>
        {
        const registeredMrxAddress = await nextVR.methods.findMrxFromVendor(accounts[0]).call();
        assert.ok(registeredMrxAddress == MRX_ADDRESS_2);
        const registeredVendorAddress = await nextVR.methods.findVendorFromMrx(MRX_ADDRESS_2).call();
        assert.ok(registeredVendorAddress == accounts[0]);
        const ghostVendorAddress = await nextVR.methods.findVendorFromMrx(MRX_ADDRESS).call();
        assert.ok(ghostVendorAddress == ZERO_ADDRESS);
        });

    });
