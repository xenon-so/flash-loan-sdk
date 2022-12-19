import { Account, clusterApiUrl, Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { Wallet } from '@project-serum/anchor'
import BN from 'bn.js';
import { findAssociatedTokenAddress, programId, USDC_MINT, USDC_MINT_DEV_NET } from "./lib/utils";
import { XenonFlashLoanClient } from "./lib/xenonFlashLoanClient";
import { createTransferInstruction } from "@solana/spl-token";

import * as dotenv from 'dotenv';
dotenv.config();

export const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || '';

const wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(WALLET_PRIVATE_KEY)))
 
const connection = new Connection(clusterApiUrl('mainnet-beta'));

const sendTransaction = async (transaction: Transaction, signers?: Account[]) => {
    transaction.feePayer = wallet.payer.publicKey
    let hash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = hash.blockhash;

    const txid = await connection.sendTransaction(transaction, [wallet.payer, ...(signers ?? [])], {
        skipPreflight: true
    })

    await connection.confirmTransaction(txid).then(s => console.log(`trx ::: https://solscan.io/tx/${txid}`));
}

const main = async () => {
    const client = new XenonFlashLoanClient(connection);
    await client.loadFlashPool();
    
    const vaultAccount = await findAssociatedTokenAddress(client.flashPool, client.mintAddress);

    const userTokenAccount = await findAssociatedTokenAddress(wallet.publicKey, client.mintAddress);
    const secondTokenAccount = await findAssociatedTokenAddress(new PublicKey('2iBo4Q9iX9zaJQBG87QLPc6aBM3N3mPBjg1bPr4S1pwp'), client.mintAddress);

    const transactionWithRepay = new Transaction();
    const borrowAmount = new BN(1*10**6);

    const repayFee = (borrowAmount.mul(new BN(10))).div(new BN(10**4))
    const simulateArbIns = createTransferInstruction(userTokenAccount, secondTokenAccount, wallet.publicKey, borrowAmount.toNumber(), [])
    transactionWithRepay.add(simulateArbIns);

    // repay the loan
    const repayLoanIns = createTransferInstruction(userTokenAccount, vaultAccount, wallet.publicKey, borrowAmount.add(repayFee).toNumber(), [])
    transactionWithRepay.add(repayLoanIns);

    await client.initiateFlashLoan(borrowAmount, wallet.publicKey, transactionWithRepay);

    await sendTransaction(transactionWithRepay);
}

// main()
