import { Account, clusterApiUrl, Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { Wallet } from '@project-serum/anchor'
import BN from 'bn.js';
import { findAssociatedTokenAddress, programId, USDC_MINT, USDC_MINT_DEV_NET } from "./lib/utils";
import { XenonFlashLoanClient } from "./lib/xenonFlashLoanClient";
import { createTransferInstruction } from "@solana/spl-token";
import { decodeMintAccountData } from "./lib/state";

import * as dotenv from 'dotenv';
dotenv.config();

export const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || '';
// const USER_PRIVATE_KEY = bs58.decode(WALLET_PRIVATE_KEY);
console.log("WALLET_PRIVATE_KEY:",process.env.WALLET_PRIVATE_KEY);

const wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(WALLET_PRIVATE_KEY)))
const USER_PUBLIC_KEY = wallet.payer.publicKey
console.log('wallet pubKey::: ', wallet.publicKey.toBase58())

// configure MAINNET or DEVNET
const mintAddress = USDC_MINT_DEV_NET; // USDC_MINT; 
const connection = new Connection(clusterApiUrl('devnet'));


const sendTransaction = async (transaction: Transaction, signers?: Account[]) => {
    transaction.feePayer = USER_PUBLIC_KEY
    let hash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = hash.blockhash;

    const txid = await connection.sendTransaction(transaction, [wallet.payer, ...(signers ?? [])], {
        skipPreflight: true
    })

    await connection.confirmTransaction(txid).then(s => console.log(`trx ::: https://solscan.io/tx/${txid}?cluster=devnet`));
}



const main = async () => {
    const client = new XenonFlashLoanClient(connection);

    const fee = 10;
    const bnNumber = new BN(fee);

    const flashPool =  PublicKey.findProgramAddressSync([mintAddress.toBuffer(), bnNumber.toArrayLike(Buffer, 'le', 2)], programId)
    console.log("flashPoolPDA: ",flashPool[0].toBase58());

    const flashPoolInfo = await connection.getAccountInfo( flashPool[0],'processed');
    if(!flashPoolInfo){
        console.error("Flash pool doesn't exist",flashPool[0].toBase58());
        return;
    }
    // const data = decodeMintAccountData(flashPoolInfo.data)
    const data = await client.getFlashPoolInfo(bnNumber,mintAddress);
    console.log("data mint:",data,data.vault.toBase58());
    
    const vaultAccount = await findAssociatedTokenAddress(flashPool[0], mintAddress);
    // const ok = await connection.getTokenAccountBalance(vaultAccount);

    // const depositTrx = new Transaction();
    // await client.deposit(10, mintAddress,  new BN(1 * 10 ** 6), wallet.publicKey, depositTrx);
    // await sendTransaction(depositTrx);
    // const x = await client.getReturnsForPoolTokens(bnNumber,mintAddress,new BN(1*10**6));
    // return;

    const userTokenAccount = await findAssociatedTokenAddress(wallet.publicKey, mintAddress);
    const secondTokenAccount = await findAssociatedTokenAddress(new PublicKey('FzWWZufmB7VcuC1KvVfUDxP3Kv4DSUbQHCR66XZYht8s'), mintAddress);

    const transactionWithRepay = new Transaction();
    const borrowAmount = new BN(10*10**6);

    const repayFee = (borrowAmount.mul(new BN(10))).div(new BN(10**4))
    const tx = createTransferInstruction(userTokenAccount, vaultAccount, wallet.publicKey, borrowAmount.add(repayFee).toNumber(), [])
    const secondTx = createTransferInstruction(userTokenAccount, secondTokenAccount, wallet.publicKey, borrowAmount.toNumber(), [])
    transactionWithRepay.add(secondTx);
    transactionWithRepay.add(tx);

    await client.initiateFlashLoan(fee, mintAddress, borrowAmount, wallet.publicKey, transactionWithRepay);

    await sendTransaction(transactionWithRepay);
}

// main()

