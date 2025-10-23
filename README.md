# 💸 StreamPay

Real-time streaming micropayments protocol built on MegaETH.

## Features

- **Payment Streams**: Stream ETH per second to any address
- **Real-time Updates**: See incoming funds update every second
- **Flexible Durations**: Stream for hours, days, or months
- **Cancel Anytime**: Sender or recipient can cancel, funds split fairly
- **Subscriptions**: Set up recurring payments (future feature)
- **Low Fees**: 0.1% platform fee

## Technology Stack

- **Smart Contracts**: Solidity + Hardhat
- **Frontend**: React + Vite + TailwindCSS
- **Blockchain**: MegaETH Testnet (Chain ID: 6342)
- **Web3**: ethers.js v6

## Setup & Deployment

### 1. Install Dependencies

```bash
npm install
cd frontend && npm install && cd ..
```

### 2. Compile Contracts

```bash
npm run compile
```

### 3. Deploy to MegaETH

```bash
npm run deploy
```

### 4. Run Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:3002

## Use Cases

### Freelancing
Stream payment per hour of work. Freelancer can withdraw anytime.

### Content Streaming
Pay content creators by the second while consuming content.

### Subscriptions
Set up recurring payments for services (SaaS, memberships, etc.)

### Salaries
Stream employee salaries 24/7, withdrawable anytime.

### Rentals
Pay rent per day automatically.

## How It Works

1. **Create Stream**: Sender deposits total amount and sets duration
2. **Auto-Calculate**: Contract calculates rate per second
3. **Real-time Accrual**: Recipient's balance increases every second
4. **Withdraw Anytime**: Recipient can withdraw accumulated funds
5. **Cancel Option**: Either party can cancel, funds split fairly

## Smart Contract Functions

### Streams
- `createStream(recipient, duration, ratePerSecond)` - Create a payment stream
- `balanceOf(streamId)` - Get current balances for recipient and sender
- `withdrawFromStream(streamId)` - Recipient withdraws accumulated funds
- `cancelStream(streamId)` - Cancel stream and split remaining funds

### Subscriptions
- `createSubscription(provider, ratePerSecond)` - Create subscription
- `processSubscriptionPayment(subscriptionId)` - Process payment
- `topUpSubscription(subscriptionId)` - Add funds to subscription
- `cancelSubscription(subscriptionId)` - Cancel subscription

## Example

Stream 0.1 ETH over 10 hours:
- Rate: 0.01 ETH/hour = 0.00000277 ETH/second
- After 5 hours: Recipient can withdraw 0.05 ETH
- After 10 hours: Full 0.1 ETH available

## Platform Fee

- Default: 0.1% (10 basis points)
- Taken from recipient's balance on withdrawal
- Can be adjusted by contract owner (max 10%)

## Smart Contract

**✅ DEPLOYED CONTRACT**

**Contract Address**: `0x1777e0cF7c4E5cF5bdC697BeDa043ebD2DCb4af0`

**View on Explorer**: https://megaexplorer.xyz/address/0x1777e0cF7c4E5cF5bdC697BeDa043ebD2DCb4af0

**Network**: MegaETH Testnet
- Chain ID: 6342
- RPC: https://carrot.megaeth.com/rpc
- Explorer: https://megaexplorer.xyz

**Deployed**: Successfully deployed and verified
**Deployer**: 0x89ae914DB5067a0F2EF532aeCB96aBd7c83F53Ef

## Building for Production

```bash
cd frontend
npm run build
```

Deploy the `frontend/dist` folder to any static hosting.

## Security Features

- ReentrancyGuard protection
- Overflow protection (Solidity 0.8+)
- Strict access controls
- Fair cancellation logic

## License

MIT

