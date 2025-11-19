import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection, ComputeBudgetProgram, TransactionInstruction,VersionedMessage, VersionedTransaction, TransactionMessage, SystemProgram } from "@solana/web3.js";
import * as dotenv from "dotenv"
import { getAssociatedTokenAddress, getAccount, TYPE_SIZE, getAssociatedTokenAddressSync, createAssociatedTokenAccount, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { TestBridge } from "./target/types/test_bridge";
import { Test } from "mocha";
import testBridgeIdl from "./target/idl/test_bridge.json";
import { ethers } from "ethers";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";
import { Transaction } from "ethers";

dotenv.config()
const secret_key: number[] =  JSON.parse(process.env.SECRET_KEY);
const program_id = new PublicKey("5bTL7owZy4yjBJDC7zmMw57WsqTJPTJEB15nAnciRahA")
const signeKeypair = Keypair.fromSecretKey(Uint8Array.from(secret_key))
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const wallet = new Wallet(signeKeypair)
const provider =  new AnchorProvider(connection, wallet, {commitment: "confirmed"})
const my_public_key = wallet.publicKey.toBase58()

const usdcAddr = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const testProgram: Program<TestBridge> = new Program(testBridgeIdl as any, provider);
const token_messenger_id = new PublicKey("CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe");

console.log(my_public_key);

// const keypair1 = Keypair.generate();
// const keypair2 = Keypair.generate();

const key1: number[] = JSON.parse(process.env.KEY1);
const key2: number[] = JSON.parse(process.env.KEY2);
const signKey1 = Keypair.fromSecretKey(Uint8Array.from(key1));
const signKey2 = Keypair.fromSecretKey(Uint8Array.from(key2));

console.log(signKey1.publicKey.toString());
console.log(signKey2.publicKey.toString());


const VAULT_ACCOUNT = {
    vaultInfo: PublicKey.findProgramAddressSync(
        [Buffer.from("DATA")],
        program_id
    )[0],

    vault: PublicKey.findProgramAddressSync(
        [Buffer.from("CONTRACT")],
        program_id,
    )[0],
}

const TOKEN_MESSENGER = {
    denylist_account: (owner: PublicKey) => {
        let seeds = [
            Buffer.from("denylist_account"),
            owner.toBuffer(),
        ];
        return PublicKey.findProgramAddressSync(
            seeds,
            token_messenger_id
        )[0];
    },

    remote_token_messenger: (domain: String) => {
        let seeds = [
            Buffer.from("remote_token_messenger"),
            Buffer.from(domain)
        ];
        return PublicKey.findProgramAddressSync(
            seeds,
            token_messenger_id
        )[0];
    },

    local_roken: (token: PublicKey) => {
        let seeds = [
            Buffer.from("local_token"),
            token.toBuffer()
        ];
        return PublicKey.findProgramAddressSync(
            seeds,
            token_messenger_id
        )[0];
    },

    sender_authority_pda: PublicKey.findProgramAddressSync(
        [Buffer.from("sender_authority")],
        token_messenger_id
    )[0],

    token_minter: PublicKey.findProgramAddressSync(
        [Buffer.from("token_minter")],
        token_messenger_id
    )[0],

}

async function initalize() {
    const tx = await testProgram.methods.initialize()
    .accounts({
        user: provider.publicKey,
    }).rpc();

    return tx;
}

async function main() {
    // const tx = await initalize();
    // console.log(tx);

    // const signature1 = await connection.requestAirdrop(signKey1.publicKey, 45);
    // await connection.confirmTransaction(signature1, "confirmed");

    // const signature2 = await connection.requestAirdrop(signKey2.publicKey, 45);
    // await connection.confirmTransaction(signature2, "confirmed");

    // console.log(await connection.getBalance(signKey1.publicKey));

    // return;

    const vaultInfo = await testProgram.account.vaultInfo.fetch(VAULT_ACCOUNT.vaultInfo);
    console.log(vaultInfo);

    let userAta = getAssociatedTokenAddressSync(usdcAddr, provider.publicKey);
    let vaultAta = getAssociatedTokenAddressSync(usdcAddr, VAULT_ACCOUNT.vault, true);

    let preIns: TransactionInstruction[] = [];
    if(await provider.connection.getAccountInfo(vaultAta) == null) {
        preIns.push(createAssociatedTokenAccountInstruction(
            provider.publicKey,
            vaultAta,
            VAULT_ACCOUNT.vault,
            usdcAddr
        ))
    }

    console.log(userAta);
    console.log(vaultAta);

    const userAccountAta = await getAccount(connection, userAta);

    console.log(userAccountAta.amount.toString());

    const recipient = "0x92534FaAA719d5d9d19a4957c761DB25BDa4349E";
    const normalize = ethers.getAddress(recipient);
    console.log(normalize);

    const addressBytes = Buffer.from(normalize.slice(2), "hex");
    const padded = Buffer.concat([Buffer.alloc(12,0), addressBytes]);
    const convertedAddress = new PublicKey(padded);
    console.log(convertedAddress);
    const tx = await testProgram.methods.send(new BN(1000000), 6, convertedAddress)
    .accounts({
        user: provider.publicKey,
        tokenMint: usdcAddr
    })
    .remainingAccounts([
        {pubkey: VAULT_ACCOUNT.vault, isWritable: false, isSigner: false},
        {pubkey: provider.publicKey, isWritable: true, isSigner: true},
        {pubkey: TOKEN_MESSENGER.sender_authority_pda, isWritable: false, isSigner: false},
        {pubkey: vaultAta, isWritable: true, isSigner: false},
        {pubkey: TOKEN_MESSENGER.denylist_account(VAULT_ACCOUNT.vault), isWritable: false, isSigner: false},
        {pubkey: new PublicKey("W1k5ijkaSTo5iA5zChNpfzcy796fLhkBxfmJuR8W8HU"), isWritable: true, isSigner: false},
        {pubkey: new PublicKey("AawthJCGRmggpfv9MMWV6Jmo9cue4gL9wUZgRBShg58W"), isWritable: false, isSigner: false},
        {pubkey: TOKEN_MESSENGER.remote_token_messenger("6"), isWritable: false, isSigner: false},
        {pubkey: new PublicKey("E1bQJ8eMMn3zmeSewW3HQ8zmJr7KR75JonbwAtWx2bux"), isWritable: false, isSigner: false},
        {pubkey: TOKEN_MESSENGER.local_roken(usdcAddr), isWritable: true, isSigner: false},
        {pubkey: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"), isWritable: true, isSigner: false},
        {pubkey: signKey1.publicKey, isWritable: true, isSigner: true},
        {pubkey: new PublicKey("CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC"), isWritable: false, isSigner: false},
        {pubkey: new PublicKey("CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe"), isWritable: false, isSigner: false},
        {pubkey: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), isWritable: false, isSigner: false},
        {pubkey: new PublicKey("11111111111111111111111111111111"), isWritable: false, isSigner: false},
        {pubkey: new PublicKey("6TCCnJ9R1m1RXFzyoH7GYH2J6NJDtZaUvfipPuLWxHNd"), isWritable: true, isSigner: false},
        {pubkey: new PublicKey("CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe"), isWritable: false, isSigner: false}
    ])
    .preInstructions(preIns)
    .signers([signKey1])
    .rpc();

    console.log(tx);
  
}

main();