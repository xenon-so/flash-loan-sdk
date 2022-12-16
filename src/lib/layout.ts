import {
    u8,
    nu64,
    struct,
    u16,
    Union,
} from 'buffer-layout';
import BN from 'bn.js';

/** @hidden */
class XenonFlashLoanInstructionsUnioin extends Union {
    constructor(discr?, defaultLayout?, property?) {
        super(discr, defaultLayout, property);
    }
    decode(b: Buffer, offset) {
        if (undefined === offset) {
            offset = 0;
        }
        const discr = this['discriminator'].decode(b, offset);

        // Adjust for old instructions that don't have optional bytes added to end
        if (
            (discr === 11 && b.length === 144) ||
            (discr === 12 && b.length === 30)
        ) {
            b = Buffer.concat([b, Buffer.from([0])]);
        } else if (discr === 37 && b.length === 141) {
            b = Buffer.concat([b, Buffer.from([0, 0])]);
        }
        return super.decode(b, offset);
    }
    addVariant(variant, layout, property) {
        return super.addVariant(variant, layout, property);
    }
}

/** @hidden */
export const XenonFlashLoanLayout = new XenonFlashLoanInstructionsUnioin(
    u8('instruction'),
);

XenonFlashLoanLayout.addVariant(
    0,
    struct([u16('fee')]),
    'Initialize',
);

XenonFlashLoanLayout.addVariant(
    1,
    struct([nu64('quantity')]),
    'Deposit',
);

XenonFlashLoanLayout.addVariant(
    2,
    struct([nu64('quantity')]),
    'Withdraw',
);

XenonFlashLoanLayout.addVariant(
    3,
    struct([nu64('quantity')]),
    'Loan',
);

XenonFlashLoanLayout.addVariant(
    4,
    struct([]),
    'Guard',
);

const instructionMaxSpan = Math.max(
    // @ts-ignore
    ...Object.values(XenonFlashLoanLayout.registry).map((r) => r.span),
);

/** @hidden */
export type TokenInstructionLayout =
    | { Initialize: { feePercentage: BN } }
    | { Deposit: { quantity: BN } }
    | { Withdraw: { quantity: BN } }
    | { Loan: { quantity: BN } }
    | { Guard: any };

/** @hidden */
export function encodeFlashLoanInstruction(data: TokenInstructionLayout) {
    const b = Buffer.alloc(instructionMaxSpan);

    // @ts-ignore
    const span = XenonFlashLoanLayout.encode(data, b);
    return b.slice(0, span);
}

