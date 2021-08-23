import { default as Web3 } from "web3";



export class MessageHashUtils
    {
    public static web3 = new Web3();

    public static hashRegistrationMessage(vendorAddress : string, mrxAddress : string, vendorRegistryContractAddress : string) : string
        {
        const hash = MessageHashUtils.web3.utils.soliditySha3
            (
            { t: "address", v: vendorAddress                 },
            { t: "address", v: vendorRegistryContractAddress },
            { t: "address", v: mrxAddress                    }
            );
        if (!hash) throw new Error("hashRegistrationMessage() is unable to pack and hash it's inputs.");
        return hash!;
        }

    public static hashMintMessage(vendorAddress : string, ammount : string, wrappedAssetContractAddress : string, nonce : string) : string
        {
        const hash = MessageHashUtils.web3.utils.soliditySha3
            (
            { t: "address", v: vendorAddress               },
            { t: "uint256", v: ammount                     },
            { t: "address", v: wrappedAssetContractAddress },
            { t: "bytes32", v: nonce                       }
            );
        if (!hash) throw new Error("hashMintMessage() is unable to pack and hash it's inputs.");
        return hash!;
        }
    }
