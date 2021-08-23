import assert              from "assert";
import { default as Web3 } from "web3";
import { Contract }        from "web3-eth-contract";
const  ganache             = require("ganache-cli");
import { SolidityUtils }   from "../solidityutils";



const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

let web3      : Web3;
let accounts  : string[];
let mrxerc20  : Contract;
let snapshotA : number;
let snapshotB : number;
let snapshotC : number;
let snapshotD : number;
let snapshotE : number;



before(async () : Promise<void> =>
    {
    web3 = new Web3(ganache.provider());
    accounts = await web3.eth.getAccounts();
    mrxerc20 = await SolidityUtils.deployFromSource("wrappedasset.sol", web3, 0, [ "Metrix", "MRX", "10000000000000000000000", 1 ], 5000000);
    console.log();
    console.log();
    });



describe("MRXERC20", () : void =>
    {

    it("deploys an MRXERC20 contract", () : void =>
        {
        assert.ok(mrxerc20.options.address);
        });

    it("is called Metrix", async () : Promise<void> =>
        {
        const name = await mrxerc20.methods.name().call();
        assert.ok("Metrix" == name);
        });

    it("has the symbol MRX", async () : Promise<void> =>
        {
        const symbol = await mrxerc20.methods.symbol().call();
        assert.ok("MRX" == symbol);
        });

    it("has 18 digits to the right of the decimal point", async () : Promise<void> =>
        {
        const decimals = await mrxerc20.methods.decimals().call();
        assert.ok(18 == decimals);
        });

    it("has a cap of 10000000000000000000000", async () : Promise<void> =>
        {
        const cap = await mrxerc20.methods.cap().call();
        assert.ok(BigInt("10000000000000000000000") == cap);
        });

    it("has an initial total supply of 0", async () : Promise<void> =>
        {
        const totalSupply = await mrxerc20.methods.totalSupply().call();
        assert.ok(0 == totalSupply);
        });

    it("has a balance of 0 in account 1", async () : Promise<void> =>
        {
        const bal1 = await mrxerc20.methods.balanceOf(accounts[1]).call();
        assert.ok(0 == bal1);
        });

    it("fails to mint 100000000000000000000000 into account 2", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            await mrxerc20.methods.mint(BigInt("100000000000000000000000")).send({ from: accounts[2], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      Mint error message is: " + e.message);
            }
        assert.ok(sawError);
        const bal2 = await mrxerc20.methods.balanceOf(accounts[2]).call();
        assert.ok(0 == bal2);
        });

    it("takes snapshot A", async () : Promise<void> =>
        {
        const txResult = await mrxerc20.methods.takeSnapshot().send({ from: accounts[0], gas: 500000 });
        assert.ok(txResult.events.SnapshotInfo.returnValues.snapshotId);
        snapshotA = txResult.events.SnapshotInfo.returnValues.snapshotId;
        const id = await mrxerc20.methods.getCurrentSnapshotId().call();
        assert.ok(snapshotA == id);
        });

    it("mints 1000 into account 1", async () : Promise<void> =>
        {
        const txResult = await mrxerc20.methods.mint(BigInt("1000")).send({ from: accounts[1], gas: 500000 });
        assert.ok(txResult.events.Transfer.returnValues.from == ZERO_ADDRESS);
        assert.ok(txResult.events.Transfer.returnValues.to == accounts[1]);
        assert.ok(txResult.events.Transfer.returnValues.value == 1000);
        });

    it("takes snapshot B", async () : Promise<void> =>
        {
        const txResult = await mrxerc20.methods.takeSnapshot().send({ from: accounts[0], gas: 500000 });
        assert.ok(txResult.events.SnapshotInfo.returnValues.snapshotId);
        snapshotB = txResult.events.SnapshotInfo.returnValues.snapshotId;
        const id = await mrxerc20.methods.getCurrentSnapshotId().call();
        assert.ok(snapshotB == id);
        });

    it("has a total supply of 1000", async () : Promise<void> =>
        {
        const totalSupply = await mrxerc20.methods.totalSupply().call();
        assert.ok(1000 == totalSupply);
        });

    it("has a balance of 1000 in account 1", async () : Promise<void> =>
        {
        const bal1 = await mrxerc20.methods.balanceOf(accounts[1]).call();
        assert.ok(1000 == bal1);
        });

    it("fails to transfer 5000 from account 1 to account 2", async () : Promise<void> =>
        {
        let sawError = false;
        let txResult : any;
        try
            {
            txResult = await mrxerc20.methods.transfer(accounts[2], BigInt("5000")).send({ from: accounts[1], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      Transfer error message is: " + e.message);
            }
        assert.ok(sawError);
        const bal2 = await mrxerc20.methods.balanceOf(accounts[2]).call();
        assert.ok(0 == bal2);
        });

    it("transfers 500 from account 1 to account 2", async () : Promise<void> =>
        {
        const txResult = await mrxerc20.methods.transfer(accounts[2], BigInt("500")).send({ from: accounts[1], gas: 500000 });
        assert.ok(txResult.events.Transfer.returnValues.from == accounts[1]);
        assert.ok(txResult.events.Transfer.returnValues.to == accounts[2]);
        assert.ok(txResult.events.Transfer.returnValues.value == 500);
        });

    it("takes snapshot C", async () : Promise<void> =>
        {
        const txResult = await mrxerc20.methods.takeSnapshot().send({ from: accounts[0], gas: 500000 });
        assert.ok(txResult.events.SnapshotInfo.returnValues.snapshotId);
        snapshotC = txResult.events.SnapshotInfo.returnValues.snapshotId;
        const id = await mrxerc20.methods.getCurrentSnapshotId().call();
        assert.ok(snapshotC == id);
        });

    it("has a balance of 500 in account 1", async () : Promise<void> =>
        {
        const bal1 = await mrxerc20.methods.balanceOf(accounts[1]).call();
        assert.ok(500 == bal1);
        });

    it("has a balance of 500 in account 2", async () : Promise<void> =>
        {
        const bal2 = await mrxerc20.methods.balanceOf(accounts[2]).call();
        assert.ok(500 == bal2);
        });

    it("has a total supply of 1000", async () : Promise<void> =>
        {
        const totalSupply = await mrxerc20.methods.totalSupply().call();
        assert.ok(1000 == totalSupply);
        });

    it("fails to burn 100000000000000000000000 from account 2", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            await mrxerc20.methods.burn(BigInt("100000000000000000000000")).send({ from: accounts[2], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      Burn error message is: " + e.message);
            }
        assert.ok(sawError);
        const bal2 = await mrxerc20.methods.balanceOf(accounts[2]).call();
        assert.ok(500 == bal2);
        });

    it("burns 500 from account 2", async () : Promise<void> =>
        {
        const txResult = await mrxerc20.methods.burn(500).send({ from: accounts[2], gas: 500000 });
        assert.ok(txResult.events.Transfer.returnValues.from == accounts[2]);
        assert.ok(txResult.events.Transfer.returnValues.to == ZERO_ADDRESS);
        assert.ok(txResult.events.Transfer.returnValues.value == 500);
        });

    it("takes snapshot D", async () : Promise<void> =>
        {
        const txResult = await mrxerc20.methods.takeSnapshot().send({ from: accounts[0], gas: 500000 });
        assert.ok(txResult.events.SnapshotInfo.returnValues.snapshotId);
        snapshotD = txResult.events.SnapshotInfo.returnValues.snapshotId;
        const id = await mrxerc20.methods.getCurrentSnapshotId().call();
        assert.ok(snapshotD == id);
        });

    it("has a balance of 500 in account 1", async () : Promise<void> =>
        {
        const bal1 = await mrxerc20.methods.balanceOf(accounts[1]).call();
        assert.ok(500 == bal1);
        });

    it("has a balance of 0 in account 2", async () : Promise<void> =>
        {
        const bal2 = await mrxerc20.methods.balanceOf(accounts[2]).call();
        assert.ok(0 == bal2);
        });

    it("has a total supply of 500", async () : Promise<void> =>
        {
        const totalSupply = await mrxerc20.methods.totalSupply().call();
        assert.ok(500 == totalSupply);
        });

    it("is not currently paused", async () : Promise<void> =>
        {
        const isPaused = await mrxerc20.methods.paused().call();
        assert.ok(!isPaused);
        });

    it("changes to the paused state", async () : Promise<void> =>
        {
        await mrxerc20.methods.pause().send({ from: accounts[0], gas: 500000 });
        const isPaused = await mrxerc20.methods.paused().call();
        assert.ok(isPaused);
        });

    it("fails to mint 500 into account 2", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            await mrxerc20.methods.mint(500).send({ from: accounts[2], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      Mint error message is: " + e.message);
            }
        assert.ok(sawError);
        const bal2 = await mrxerc20.methods.balanceOf(accounts[2]).call();
        assert.ok(0 == bal2);
        });

    it("fails to transfer 100 from account 1 to account 2", async () : Promise<void> =>
        {
        let sawError = false;
        let txResult : any;
        try
            {
            txResult = await mrxerc20.methods.transfer(accounts[2], 100).send({ from: accounts[1], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      Transfer error message is: " + e.message);
            }
        assert.ok(sawError);
        const bal2 = await mrxerc20.methods.balanceOf(accounts[2]).call();
        assert.ok(0 == bal2);
        });

    it("fails to burn 100 from account 1", async () : Promise<void> =>
        {
        let sawError = false;
        try
            {
            await mrxerc20.methods.burn(100).send({ from: accounts[1], gas: 500000 });
            }
        catch (e)
            {
            sawError = true;
            console.log("      Burn error message is: " + e.message);
            }
        assert.ok(sawError);
        const bal = await mrxerc20.methods.balanceOf(accounts[1]).call();
        assert.ok(500 == bal);
        });

    it("changes back to the unpaused state", async () : Promise<void> =>
        {
        await mrxerc20.methods.unpause().send({ from: accounts[0], gas: 500000 });
        const isPaused = await mrxerc20.methods.paused().call();
        assert.ok(!isPaused);
        });

    it("transfers 300 from account 1 to account 2", async () : Promise<void> =>
        {
        const txResult = await mrxerc20.methods.transfer(accounts[2], 300).send({ from: accounts[1], gas: 500000 });
        assert.ok(txResult.events.Transfer.returnValues.from == accounts[1]);
        assert.ok(txResult.events.Transfer.returnValues.to == accounts[2]);
        assert.ok(txResult.events.Transfer.returnValues.value == 300);
        });

    it("takes snapshot E", async () : Promise<void> =>
        {
        const txResult = await mrxerc20.methods.takeSnapshot().send({ from: accounts[0], gas: 500000 });
        assert.ok(txResult.events.SnapshotInfo.returnValues.snapshotId);
        snapshotE = txResult.events.SnapshotInfo.returnValues.snapshotId;
        const id = await mrxerc20.methods.getCurrentSnapshotId().call();
        assert.ok(snapshotE == id);
        });

    it("has a balance of 200 in account 1", async () : Promise<void> =>
        {
        const bal1 = await mrxerc20.methods.balanceOf(accounts[1]).call();
        assert.ok(200 == bal1);
        });

    it("has a balance of 300 in account 2", async () : Promise<void> =>
        {
        const bal2 = await mrxerc20.methods.balanceOf(accounts[2]).call();
        assert.ok(300 == bal2);
        });

    it("has a total supply of 500", async () : Promise<void> =>
        {
        const totalSupply = await mrxerc20.methods.totalSupply().call();
        assert.ok(500 == totalSupply);
        });

    it("has a total supply of 0 at snapshotA", async () : Promise<void> =>
        {
        const supply = await mrxerc20.methods.totalSupplyAt(snapshotA).call();
        assert.ok(0 == supply);
        });

    it("has a total supply of 1000 at snapshotB", async () : Promise<void> =>
        {
        const supply = await mrxerc20.methods.totalSupplyAt(snapshotB).call();
        assert.ok(1000 == supply);
        });

    it("has a total supply of 1000 at snapshotC", async () : Promise<void> =>
        {
        const supply = await mrxerc20.methods.totalSupplyAt(snapshotC).call();
        assert.ok(1000 == supply);
        });

    it("has a total supply of 500 at snapshotD", async () : Promise<void> =>
        {
        const supply = await mrxerc20.methods.totalSupplyAt(snapshotD).call();
        assert.ok(500 == supply);
        });

    it("has a total supply of 500 at snapshotE", async () : Promise<void> =>
        {
        const supply = await mrxerc20.methods.totalSupplyAt(snapshotE).call();
        assert.ok(500 == supply);
        });

    it("has a balance of 0 in account 1 at snapshotA", async () : Promise<void> =>
        {
        const bal1A = await mrxerc20.methods.balanceOfAt(accounts[1], snapshotA).call();
        assert.ok(0 == bal1A);
        });

    it("has a balance of 1000 in account 1 at snapshotB", async () : Promise<void> =>
        {
        const bal1B = await mrxerc20.methods.balanceOfAt(accounts[1], snapshotB).call();
        assert.ok(1000 == bal1B);
        });

    it("has a balance of 500 in account 1 at snapshotC", async () : Promise<void> =>
        {
        const bal = await mrxerc20.methods.balanceOfAt(accounts[1], snapshotC).call();
        assert.ok(500 == bal);
        });

    it("has a balance of 500 in account 1 at snapshotD", async () : Promise<void> =>
        {
        const bal = await mrxerc20.methods.balanceOfAt(accounts[1], snapshotD).call();
        assert.ok(500 == bal);
        });

    it("has a balance of 200 in account 1 at snapshotE", async () : Promise<void> =>
        {
        const bal = await mrxerc20.methods.balanceOfAt(accounts[1], snapshotE).call();
        assert.ok(200 == bal);
        });

    it("has a balance of 0 in account 2 at snapshotA", async () : Promise<void> =>
        {
        const bal1A = await mrxerc20.methods.balanceOfAt(accounts[2], snapshotA).call();
        assert.ok(0 == bal1A);
        });

    it("has a balance of 0 in account 2 at snapshotB", async () : Promise<void> =>
        {
        const bal1B = await mrxerc20.methods.balanceOfAt(accounts[2], snapshotB).call();
        assert.ok(0 == bal1B);
        });

    it("has a balance of 500 in account 2 at snapshotC", async () : Promise<void> =>
        {
        const bal = await mrxerc20.methods.balanceOfAt(accounts[2], snapshotC).call();
        assert.ok(500 == bal);
        });

    it("has a balance of 0 in account 2 at snapshotD", async () : Promise<void> =>
        {
        const bal = await mrxerc20.methods.balanceOfAt(accounts[2], snapshotD).call();
        assert.ok(0 == bal);
        });

    it("has a balance of 300 in account 2 at snapshotE", async () : Promise<void> =>
        {
        const bal = await mrxerc20.methods.balanceOfAt(accounts[2], snapshotE).call();
        assert.ok(300 == bal);
        });

    });
