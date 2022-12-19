import { getMint } from "@solana/spl-token";
import { AccountInfo, Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import BN from 'bn.js';
import { Instructions } from "./instructions";
import { decodeMintAccountData, FlashPoolState } from "./state";
import { createAssociatedTokenAccountIfNotExist, findAssociatedTokenAddress, programId, USDC_MINT } from "./utils";

/**
 * This client is mainly for demo purposes to show you how to use the Instructions class
 *
 * ### Example
 * ```js
 * import { XenonFlashLoanClient } from '@xenon/flash-loans'
 * const client = new XenonFlashLoanClient(connection, fee, mintAddress);
 * await client.loadFlashPool();
 * const transaction = new Transaction();
 * await client.initializeXenonAccount(..., transaction, ...);
 * ```
 */
export class XenonFlashLoanClient {
    connection: Connection;
    flashPool: PublicKey;
    flashPoolInfo: AccountInfo<Buffer>;
    mintAddress: PublicKey;

    constructor(connection: Connection) {
        const fee = new BN(10);
        this.connection = connection;
        this.mintAddress = USDC_MINT;
        this.flashPool = PublicKey.findProgramAddressSync([USDC_MINT.toBuffer(), fee.toArrayLike(Buffer, 'le', 2)], programId)[0];
    }

    /**
     * This must be called before interacting with this client
     */
    async loadFlashPool() {
        const flashPoolInfo = await this.connection.getAccountInfo(this.flashPool, 'processed');
        if (!flashPoolInfo) {
            throw new Error(`Flash pool doesn't exist for ${this.flashPool.toBase58()} `);
        }
        this.flashPoolInfo = flashPoolInfo;
    }

    /**
     * Get Flash pool info with the given mint and fee
     */
    getFlashPoolInfo(): FlashPoolState {
        if (!this.flashPoolInfo) throw new Error(
            `Flash pool doesn't exist for ${this.flashPool.toBase58()} \n Call loadFlashPool() first`
        );
        return decodeMintAccountData(this.flashPoolInfo.data);
    }

    /**
     * Deposit into a Xenon Flashpool with a given Mint and fee
     */
    async deposit(
        quantity: BN,
        owner: PublicKey,
        transaction: Transaction = new Transaction(),
    ): Promise<Transaction> {
        // check if pool exist 
        this.getFlashPoolInfo();

        const baseTokenAccount = await findAssociatedTokenAddress(owner, this.mintAddress);

        const fTokenMint = PublicKey.findProgramAddressSync([this.flashPool.toBuffer(), Buffer.from("ftoken")], programId);
        const vaultAccount = await createAssociatedTokenAccountIfNotExist({ publicKey: owner }, this.mintAddress, this.flashPool, transaction, this.connection);
        const fTokenMintATA = await createAssociatedTokenAccountIfNotExist({ publicKey: owner }, fTokenMint[0], owner, transaction, this.connection);

        transaction.add(Instructions.makeDepositInstruction(
            owner,
            baseTokenAccount,
            vaultAccount,
            this.flashPool,
            fTokenMint[0],
            fTokenMintATA,
            quantity
        ))

        return transaction
    }

    /**
     * Withdraw from a Xenon Flashpool with a given Mint and fee
     */
    async withdraw(
        quantity: BN,
        owner: PublicKey,
        transaction: Transaction = new Transaction(),
    ): Promise<Transaction> {
        // check if pool exist 
        this.getFlashPoolInfo()

        const baseTokenAccount = await findAssociatedTokenAddress(owner, this.mintAddress);

        const fTokenMint = PublicKey.findProgramAddressSync([this.flashPool.toBuffer(), Buffer.from("ftoken")], programId);
        const vaultAccount = await createAssociatedTokenAccountIfNotExist({ publicKey: owner }, this.mintAddress, this.flashPool, transaction, this.connection);
        const fTokenMintATA = await createAssociatedTokenAccountIfNotExist({ publicKey: owner }, fTokenMint[0], owner, transaction, this.connection);

        transaction.add(Instructions.makeWithdrawInstruction(
            this.flashPool,
            owner,
            baseTokenAccount,
            vaultAccount,
            fTokenMint[0],
            fTokenMintATA,
            quantity
        ))

        return transaction
    }

    /**
    * Gets a loan from a flashpool with the given fee and mint
    */
    async createLoan(
        quantity: BN,
        owner: PublicKey
    ): Promise<TransactionInstruction> {

        // check if pool exist 
        this.getFlashPoolInfo();
        const baseTokenAccount = await findAssociatedTokenAddress(owner, this.mintAddress);
        const vaultAccount = await findAssociatedTokenAddress(this.flashPool, this.mintAddress);

        return Instructions.makeLoanInstruction(
            this.flashPool,
            baseTokenAccount,
            vaultAccount,
            quantity
        );
    }

    /**
     *  Generates a Guard Instruction to be added to the flash loan transaction
     */
    async createGuard(
    ): Promise<TransactionInstruction> {
        // check if pool exist 
        this.getFlashPoolInfo()
        const vaultAccount = await findAssociatedTokenAddress(this.flashPool, this.mintAddress);

        return Instructions.makeGuardInstruction(
            this.flashPool,
            vaultAccount
        )
    }

    /**
     * This function helps you sandwich your transaction with loan and guards instructions
     *
     * ### Example
     * ```js
     * client.initiateFlashLoan(....)
     * ```
     * @returns transaction
     */
    async initiateFlashLoan(
        quantity: BN,
        owner: PublicKey,
        transaction: Transaction,
    ) {
        // check if pool exist 
        this.getFlashPoolInfo()

        const loanIns = await this.createLoan(quantity, owner);
        const guardIns = await this.createGuard();

        transaction.instructions.unshift(loanIns);
        transaction.add(guardIns);
    }

    /**
     *  Gets the number of base tokens which can be redeemed for the given quantity of pool tokens
     */
    async getReturnsForPoolTokens(
        quantity: BN,
    ): Promise<BN> {
        this.getFlashPoolInfo()

        const flashPoolStateData = decodeMintAccountData(this.flashPoolInfo.data);
        const flashPoolMint = PublicKey.findProgramAddressSync([this.flashPool.toBuffer(), Buffer.from("ftoken")], programId);

        // get total supply of poolMint
        const mintAccountInfo = await getMint(this.connection, flashPoolMint[0]);
        const supply = new BN(mintAccountInfo.supply.toString())

        // get pool base token deposits
        const tokenAmount = await this.connection.getTokenAccountBalance(flashPoolStateData.vault);
        const baseTokenDeposits = new BN(tokenAmount.value.amount);

        const baseTokenReturns = baseTokenDeposits.div(supply).mul(quantity);
        return baseTokenReturns;
    }

}