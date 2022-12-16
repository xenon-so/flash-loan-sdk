# Flash-loans

Javascript/Typescript package for creating xenon compatible solana flash loan instructions

## Installation

### Yarn
```
yarn add @xenon/flash-loan
```
### npm
```
npm install @xenon/flash-loan
```

## Basic usage

```js
import { XenonFlashLoanClient } from '@xenon/flash-loan'

...
const xenonFlashLoanClient = new XenonFlashLoanClient(connection)

const transaction = new Transaction();

transaction.add(do_whatever_you_want_instruction)
transaction.add(repay_loan_instruction)

// this modifies your transaction and makes it xenon compatible
await client.initiateFlashLoan(fee, quantity, transaction mintAddress, owner);

sendTransaction(transaction)
```

## Bot usage
```js
import { Instructions } from '@xenon/flash-loan'

...

const transaction = new Transaction();
transaction.add(do_whatever_you_want_instruction)
transaction.add(repay_loan_instruction)

transaction.add(
    Instructions.makeLoanInstruction(
        flashPoolAddress,
        recieverTokenAccount,
        vaultAccount,
        quantity)
)

transaction.add(
    Instructions.makeGuardInstruction(flashPoolAddress, vaultAccount)
)

sendTransaction(transaction)
```

***Checkout [test-sdk.ts](https://github.com/xenon-so/flash-loan-sdk/blob/main/src/test-sdk.ts) for an example.***