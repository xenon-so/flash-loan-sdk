import { PublicKey, TransactionInstruction } from "@solana/web3.js"

export const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
export const USDC_MINT_DEV_NET = new PublicKey('8FRFC6MoGGkMFQwngccyu69VnYbzykGeez7ignHVAFSN')

// Main FlashPool with Mint=USDC_MINT and FEE=10 bps
export const MAIN_FLASHPOOL_PDA = new PublicKey('BvXys6YwpVjGi4KaEYZ8fVhGoMszySsejmzCC17Y5bnG')
// Main Devnet FlashPool with Mint=USDC_MINT_DEV_NET and FEE=10 bps
export const MAIN_FLASHPOOL_PDA_DEV_NET = new PublicKey('2ekTDZ8qBXoxAGjmmLsTQ8eFpddPMV3qyZmtgN2rVWqY')

export const MAIN_FLASHPOOL_VAULT = new PublicKey('GiWNUGCt4t2QPxuubMTbWzAiJNQibLPdHRm6RkKy1H9x')
export const MAIN_FLASHPOOL_VAULT_DEV_NET = new PublicKey('5zVjTsmkcSzcbefjybv5tahoi6BgpiGCtuggBWps4aZe')

export const FLASH_POOL_TOKEN = new PublicKey('ADm19vVzQ37u7kNaHfBDD7atTUY5uaLvLEvYmpSVYKme')

/** @hidden */
// mainnet
export const programId = new PublicKey('4s51M1seJDzp3kZ5sV63495giSakiers5GZeu4mWwpXD')

/** @hidden */
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111')
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
export const MEMO_PROGRAM_ID = new PublicKey('Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo')
export const RENT_PROGRAM_ID = new PublicKey('SysvarRent111111111111111111111111111111111')
export const CLOCK_PROGRAM_ID = new PublicKey('SysvarC1ock11111111111111111111111111111111')
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

export async function findProgramAddress(seeds, programId) {
  const [publicKey, nonce] = await PublicKey.findProgramAddress(seeds, programId)
  return { publicKey, nonce }
}

export async function findAssociatedTokenAddress(walletAddress, tokenMintAddress) {
  const { publicKey } = await findProgramAddress(
    [walletAddress.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), tokenMintAddress.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )
  return publicKey
}

export async function createAssociatedTokenAccountIfNotExist(
  wallet,
  tokenMintAddress,
  owner,
  transaction,
  connection
) {
  const associatedTokenAddress = await findAssociatedTokenAddress(owner, tokenMintAddress)

  const tokenAccount = await connection.getAccountInfo(associatedTokenAddress);

  if (tokenAccount == null) {
    const keys = [
      {
        pubkey: wallet.publicKey,
        isSigner: true,
        isWritable: true
      },
      {
        pubkey: associatedTokenAddress,
        isSigner: false,
        isWritable: true
      },
      {
        pubkey: owner,
        isSigner: false,
        isWritable: false
      },
      {
        pubkey: tokenMintAddress,
        isSigner: false,
        isWritable: false
      },
      {
        pubkey: SYSTEM_PROGRAM_ID,
        isSigner: false,
        isWritable: false
      },
      {
        pubkey: TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false
      },
      {
        pubkey: RENT_PROGRAM_ID,
        isSigner: false,
        isWritable: false
      }
    ]
    transaction.add(
      new TransactionInstruction({
        keys,
        programId: ASSOCIATED_TOKEN_PROGRAM_ID,
        data: Buffer.from([])
      }))
    //await signAndSendTransaction(wallet, transaction)
  }
  return associatedTokenAddress
}