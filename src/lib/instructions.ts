import { PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY, SYSVAR_RENT_PUBKEY, TransactionInstruction } from "@solana/web3.js";
import { encodeFlashLoanInstruction } from "./layout";
import { programId, SYSTEM_PROGRAM_ID, TOKEN_PROGRAM_ID } from "./utils";
import BN from 'bn.js'
/**
 * Class with all Flash Pool Instructions
 */
export class Instructions {
    constructor() { };

    /**
     * Instruction to create a new Flash Pool on Xenon
     *
     * @param owner
     * @param vaultAccount
     * @param flashPoolAddress
     * @param usdcMintAddress
     * @param poolMintAddress 
     * @param feePercentage in bps 
     * @returns TransactionInstruction 
     */
    static makeInitializePoolInstruction(
        owner: PublicKey,
        vaultAccount: PublicKey,
        flashPoolAddress: PublicKey,
        usdcMintAddress: PublicKey,
        poolMintAddress: PublicKey,
        feePercentage: BN
    ): TransactionInstruction {
        const keys = [
            { isSigner: false, isWritable: true, pubkey: flashPoolAddress }, //xenon State Account
            { isSigner: true, isWritable: true, pubkey: owner },
            { isSigner: false, isWritable: true, pubkey: usdcMintAddress },
            { isSigner: false, isWritable: true, pubkey: poolMintAddress },
            { isSigner: false, isWritable: true, pubkey: vaultAccount },
            { isSigner: false, isWritable: false, pubkey: SYSTEM_PROGRAM_ID },
            { isSigner: false, isWritable: false, pubkey: SYSVAR_RENT_PUBKEY },
            { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID }
        ]
        const data = encodeFlashLoanInstruction({
            Initialize: {
                feePercentage
            }
        })
        return new TransactionInstruction({ keys, data, programId });
    }

    /**
     * Instruction to deposit in a flash pool
     *
     * @param owner
     * @param baseTokenAccount
     * @param vaultAccount
     * @param flashPoolAddress PDA of the flash pool
     * @param fTokenMintAddress Token Mint Address of the Flash Pool Token
     * @param fTokenATA User's fTokenMintAddress Associated Token Account  
     * @param quantity Amount to be deposited in the pool
     * @returns TransactionInstruction 
     */
    static makeDepositInstruction(
        owner: PublicKey,
        baseTokenAccount: PublicKey,
        vaultAccount: PublicKey,
        flashPoolAddress: PublicKey,
        fTokenMintAddress: PublicKey,
        fTokenATA: PublicKey,
        quantity: BN
    ): TransactionInstruction {
        const keys = [
            { isSigner: false, isWritable: true, pubkey: flashPoolAddress, },
            { isSigner: true, isWritable: true, pubkey: owner },
            { isSigner: false, isWritable: true, pubkey: baseTokenAccount },
            { isSigner: false, isWritable: true, pubkey: vaultAccount },
            { isSigner: false, isWritable: true, pubkey: fTokenMintAddress },
            { isSigner: false, isWritable: true, pubkey: fTokenATA },
            { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID }
        ]
        const data = encodeFlashLoanInstruction({
            Deposit: {
                quantity: quantity
            }
        })
        return new TransactionInstruction({ keys, data, programId });
    }

    /**
     * Instruction to withdraw from flash pool
     *
     * @param flashPoolAddress
     * @param owner
     * @param baseTokenAccount
     * @param vaultAccount
     * @param fTokenMintAddress Token Mint Address of the Flash Pool Token
     * @param fTokenATA User's flashPoolMintAddress Associated Token Account  
     * @param quantity Amount to be withdrawn from the pool
     * @returns TransactionInstruction 
     */
    static makeWithdrawInstruction(
        flashPoolAddress: PublicKey,
        owner: PublicKey,
        baseTokenAccount: PublicKey,
        vaultAccount: PublicKey,
        fTokenMintAddress: PublicKey,
        fTokenATA: PublicKey,
        quantity: BN
    ): TransactionInstruction {
        const keys = [
            { isSigner: false, isWritable: true, pubkey: flashPoolAddress },
            { isSigner: true, isWritable: true, pubkey: owner },
            { isSigner: false, isWritable: true, pubkey: fTokenATA },
            { isSigner: false, isWritable: true, pubkey: vaultAccount },
            { isSigner: false, isWritable: true, pubkey: baseTokenAccount },
            { isSigner: false, isWritable: true, pubkey: fTokenMintAddress },
            { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID }
        ]
        const data = encodeFlashLoanInstruction({
            Withdraw: {
                quantity
            }
        })
        return new TransactionInstruction({ keys, data, programId });
    }

    /**
     * Instruction to take a loan from the flash pool
     *
     * @param flashPoolAddress
     * @param recieverTokenAccount ATA of the reciever 
     * @param vaultAccount Flash Pool Vault Account
     * @param quantity Amount to loan from the pool
     * @returns TransactionInstruction 
     */
    static makeLoanInstruction(
        flashPoolAddress: PublicKey,
        recieverTokenAccount: PublicKey,
        vaultAccount: PublicKey,
        quantity: BN
    ): TransactionInstruction {
        const keys = [
            { pubkey: flashPoolAddress, isSigner: false, isWritable: true },
            { pubkey: recieverTokenAccount, isSigner: false, isWritable: true },
            { pubkey: vaultAccount, isSigner: false, isWritable: true },
            { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
        ]
        const data = encodeFlashLoanInstruction({
            Loan: {
                quantity
            }
        })
        return new TransactionInstruction({ keys, data, programId });
    }

    /**
     * Gaurd Instruction : SHOULD BE LAST INSTRUCTION OF THE TRANSACTION
     *
     * @param flashPoolAddress
     * @param vaultAccount Flash Pool Vault Account
     * @returns TransactionInstruction 
     */
    static makeGuardInstruction(
        flashPoolAddress: PublicKey,
        vaultAccount: PublicKey,
    ): TransactionInstruction {
        const keys = [
            { isSigner: false, isWritable: true, pubkey: flashPoolAddress },
            { isSigner: false, isWritable: true, pubkey: vaultAccount },
        ]
        const data = encodeFlashLoanInstruction({
            Guard: {}
        })
        return new TransactionInstruction({ keys, data, programId });
    }
}