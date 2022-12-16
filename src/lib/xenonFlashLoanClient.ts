import { getMint } from "@solana/spl-token";
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import BN from 'bn.js';
import { Instructions } from "./instructions";
import { decodeMintAccountData, FlashPoolState } from "./state";
import { createAssociatedTokenAccountIfNotExist, findAssociatedTokenAddress, programId } from "./utils";

/**
 * This client is mainly for demo purposes to show you how to use the Instructions class
 *
 * ### Example
 * ```js
 * import { XenonFlashLoanClient } from '@xenon/flash-loans'
 * const client = new XenonFlashLoanClient(connection);
 * const transaction = new Transaction();
 * await client.initializeXenonAccount(..., transaction, ...);
 * ```
 */
export class XenonFlashLoanClient {
    private connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }
    /**
     * Create a new Flash pool with the given mint and fee
     */
    async createFlashPool(
        fee: BN,
        mintAddress: PublicKey,
        owner: PublicKey,
        transaction: Transaction = new Transaction(),
    ): Promise<Transaction> {
        const bnNumber = new BN(fee);

        const flashPool =  PublicKey.findProgramAddressSync([mintAddress.toBuffer(), bnNumber.toArrayLike(Buffer, 'le', 2)], programId)
        const flashPoolMint =  PublicKey.findProgramAddressSync([flashPool[0].toBuffer(), Buffer.from("ftoken")], programId);
        const vaultAccount = await createAssociatedTokenAccountIfNotExist({ publicKey: owner }, mintAddress, flashPool[0], transaction, this.connection);

        transaction.add(Instructions.makeInitializePoolInstruction(
            owner,
            vaultAccount,
            flashPool[0],
            mintAddress,
            flashPoolMint[0],
            fee
        ))

        return transaction
    }

    /**
     * get Flash pool info with the given mint and fee
     */
    async getFlashPoolInfo(
        fee: BN,
        mintAddress: PublicKey,
    ): Promise<FlashPoolState | null> {

        const flashPool =  PublicKey.findProgramAddressSync([mintAddress.toBuffer(), fee.toArrayLike(Buffer, 'le', 2)], programId)
        const flashPoolInfo = await this.connection.getAccountInfo(flashPool[0],'processed');
        if(!flashPoolInfo){
            console.error("Flash pool doesn't exist",flashPool[0].toBase58());
            return;
        }
        return decodeMintAccountData(flashPoolInfo.data);
    }

    /**
     * deposit into a Xenon Flashpool with a given Mint and fee
     */
    async deposit(
        fee: number,
        mintAddress: PublicKey,
        quantity: BN,
        owner: PublicKey,
        transaction: Transaction = new Transaction(),
    ): Promise<Transaction> {
        const bnNumber = new BN(fee);

        const flashPoolPDA =  PublicKey.findProgramAddressSync([mintAddress.toBuffer(), bnNumber.toArrayLike(Buffer, 'le', 2)], programId);
        // check if pool exist 
        const flashPoolInfo = await this.connection.getAccountInfo(flashPoolPDA[0],'processed',);
        if(!flashPoolInfo){
            console.error("Flash pool doesn't exist",flashPoolPDA[0].toBase58());
            return;
        }

        const baseTokenAccount = await findAssociatedTokenAddress(owner, mintAddress);

        const fTokenMint =  PublicKey.findProgramAddressSync([flashPoolPDA[0].toBuffer(), Buffer.from("ftoken")], programId);
        const vaultAccount = await createAssociatedTokenAccountIfNotExist({ publicKey: owner }, mintAddress, flashPoolPDA[0], transaction, this.connection);
        const fTokenMintATA = await createAssociatedTokenAccountIfNotExist({ publicKey: owner }, fTokenMint[0], owner, transaction, this.connection);

        transaction.add(Instructions.makeDepositInstruction(
            owner,
            baseTokenAccount,
            vaultAccount,
            flashPoolPDA[0],
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
        fee: number,
        mintAddress: PublicKey,
        quantity: BN,
        owner: PublicKey,
        transaction: Transaction = new Transaction(),
    ): Promise<Transaction> {
        const bnNumber = new BN(fee);

        const flashPoolPDA =  PublicKey.findProgramAddressSync([mintAddress.toBuffer(), bnNumber.toArrayLike(Buffer, 'le', 2)], programId);
        // check if pool exist 
        const flashPoolInfo = await this.connection.getAccountInfo(flashPoolPDA[0],'processed');
        if(!flashPoolInfo){
            console.error("Flash pool doesn't exist",flashPoolPDA[0].toBase58());
            return;
        }
        const baseTokenAccount = await findAssociatedTokenAddress(owner, mintAddress);

        const fTokenMint =  PublicKey.findProgramAddressSync([flashPoolPDA[0].toBuffer(), Buffer.from("ftoken")], programId);
        const vaultAccount = await createAssociatedTokenAccountIfNotExist({ publicKey: owner }, mintAddress, flashPoolPDA[0], transaction, this.connection);
        const fTokenMintATA = await createAssociatedTokenAccountIfNotExist({ publicKey: owner }, fTokenMint[0], owner, transaction, this.connection);

        transaction.add(Instructions.makeWithdrawInstruction(
            flashPoolPDA[0],
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
     * gets a loan from a flashpool with the given fee and mint
     */
    async createLoan(
        fee: number,
        quantity: BN,
        mintAddress: PublicKey,
        owner: PublicKey
    ): Promise<TransactionInstruction> {
        const bnNumber = new BN(fee);

        const flashPool =  PublicKey.findProgramAddressSync([mintAddress.toBuffer(), bnNumber.toArrayLike(Buffer, 'le', 2)], programId)
        // check if pool exist 
        const flashPoolInfo = await this.connection.getAccountInfo(flashPool[0],'processed');
        if(!flashPoolInfo){
            console.error("Flash pool doesn't exist",flashPool[0].toBase58());
            return;
        }
        const baseTokenAccount = await findAssociatedTokenAddress(owner, mintAddress);
        const vaultAccount = await findAssociatedTokenAddress(flashPool[0], mintAddress);

        return Instructions.makeLoanInstruction(
            flashPool[0],
            baseTokenAccount,
            vaultAccount,
            quantity
        );
    }

    /**
     *  generates a Guard Instruction to be added to the flash loan transaction
     */
    async createGuard(
        fee: number = 10,
        mintAddress: PublicKey,
    ): Promise<TransactionInstruction> {
        const bnNumber = new BN(fee);

        const flashPool =  PublicKey.findProgramAddressSync([mintAddress.toBuffer(), bnNumber.toArrayLike(Buffer, 'le', 2)], programId);
        // check if pool exist 
        const flashPoolInfo = await this.connection.getAccountInfo(flashPool[0],'processed');
        if(!flashPoolInfo){
            console.error("Flash pool doesn't exist",flashPool[0].toBase58());
            return;
        }
        const vaultAccount = await findAssociatedTokenAddress(flashPool[0], mintAddress);

        return Instructions.makeGuardInstruction(
            flashPool[0],
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
        fee: number,
        mintAddress: PublicKey,
        quantity: BN,
        owner: PublicKey,
        transaction: Transaction,
    ) {

        const bnNumber = new BN(fee);
        const flashPoolPDA =  PublicKey.findProgramAddressSync([mintAddress.toBuffer(), bnNumber.toArrayLike(Buffer, 'le', 2)], programId);
        // check if pool exist 
        const flashPoolInfo = await this.connection.getAccountInfo(flashPoolPDA[0],'processed');
        if(!flashPoolInfo){
            console.error("Flash pool doesn't exist",flashPoolPDA[0].toBase58());
            return;
        }

        const loanIns = await this.createLoan(fee, quantity, mintAddress, owner);
        const guardIns = await this.createGuard(fee,mintAddress);

        transaction.instructions.unshift(loanIns);
        transaction.add(guardIns);
    }

    /**
     *  gets the number of base tokens which can be redeemed for the given quantity of pool tokens
     */
    async getReturnsForPoolTokens(
        fee: BN,
        mintAddress: PublicKey,
        quantity: BN,
    ) : Promise<BN> {
        const flashPool =  PublicKey.findProgramAddressSync([mintAddress.toBuffer(), fee.toArrayLike(Buffer, 'le', 2)], programId)
        console.log("flashPool: ",flashPool[0].toBase58());
    
        const flashPoolInfo = await this.connection.getAccountInfo(flashPool[0],'processed');
        if(!flashPoolInfo){
            console.error("Flash pool doesn't exist",flashPool[0].toBase58());
            return;
        }
        const flashPoolStateData = decodeMintAccountData(flashPoolInfo.data);
        const flashPoolMint =  PublicKey.findProgramAddressSync([flashPool[0].toBuffer(), Buffer.from("ftoken")], programId);


        // get total supply of poolMint
        const mintAccountInfo = await getMint(this.connection, flashPoolMint[0]);
        const supply = new BN(mintAccountInfo.supply.toString()) 
        // console.log("supply:",supply.toString())

        // get pool base token deposits
        const tokenAmount = await this.connection.getTokenAccountBalance(flashPoolStateData.vault);
        const baseTokenDeposits =  new BN(tokenAmount.value.uiAmount * 10**tokenAmount.value.decimals);
        // console.log("baseTokenDeposits:",baseTokenDeposits.toString());

        const baseTokenReturns = baseTokenDeposits.div(supply).mul(quantity);
        // console.log("baseTokenReturns:",baseTokenReturns.toString())
        return baseTokenReturns;

    }

}