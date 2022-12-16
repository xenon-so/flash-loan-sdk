import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { Layout, publicKey, u64 , struct, u8, u16} from '@project-serum/borsh';
// import { struct, u8, u32, u16  } from 'buffer-layout';

export interface FlashPoolState {
  isLoanActive: boolean;
  bump: number;
  noOfFlashLoans: number;
  fee: number;
  mint: PublicKey;
  vault: PublicKey;
  expectedBal: BN;
}


export const FlashPoolLayout: Layout<FlashPoolState> = struct([
  u8('isLoanActive'),
  u8('bump'),
  u16('noOfFlashLoans'),
  u16('padding'),
  u16('fee'),
  publicKey('mint'),
  publicKey('vault'),
  u64('expectedBal'),
]);


export function decodeMintAccountData(data: Buffer): FlashPoolState {
  return FlashPoolLayout.decode(data);
}


