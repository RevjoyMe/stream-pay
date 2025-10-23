# 💸 StreamPay - Vercel Deployment Guide

## Contract Info
**Address**: `0x1777e0cF7c4E5cF5bdC697BeDa043ebD2DCb4af0`  
**Explorer**: https://megaexplorer.xyz/address/0x1777e0cF7c4E5cF5bdC697BeDa043ebD2DCb4af0

## Quick Deploy

```bash
cd stream-pay/frontend
npm install
vercel
vercel --prod
```

## Vercel Configuration

Create `vercel.json` in `stream-pay/`:

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "framework": "vite"
}
```

## Project Settings

- **Framework**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 18.x

## Testing Checklist

### 1. Deposit Funds
- Connect wallet
- Deposit ETH to contract
- Verify balance updates

### 2. Create Stream
- Enter recipient address
- Set amount (ETH)
- Choose duration (hours/days/months)
- Verify streaming rate calculation
- Create stream

### 3. Monitor Stream
- See real-time progress bar
- View streamed/remaining amounts
- Check start/end times

### 4. Withdraw
- Recipient can withdraw anytime
- View accumulated funds
- Instant withdrawal

### 5. Cancel Stream
- Either party can cancel
- Fair split of remaining funds
- Immediate settlement

## Features to Test

### Dashboard View
- ✅ Outgoing streams list
- ✅ Incoming streams list
- ✅ Withdrawable balance
- ✅ Real-time progress bars
- ✅ Stream status indicators

### Create Stream View
- ✅ Recipient address validation
- ✅ Amount input
- ✅ Duration selector (hours/days/months)
- ✅ Rate calculation preview
- ✅ Form validation

### Stream Management
- ✅ Cancel button for active streams
- ✅ Withdraw button for recipients
- ✅ Timestamp displays
- ✅ Amount displays

## UI Components

### Progress Bar
```jsx
<div className="w-full bg-gray-200 rounded-full h-2">
  <div 
    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full animate-flow"
    style={{ width: `${progress}%` }}
  />
</div>
```

### Stream Card
- Stream ID
- Counterparty address
- Rate per hour
- Progress bar with percentage
- Streamed/Remaining amounts
- Start/End timestamps
- Action buttons (Withdraw/Cancel)

## Smart Contract Functions

### User Functions
```javascript
// Create stream
await contract.createStream(recipient, duration, ratePerSecond, {
  value: totalAmount
})

// Withdraw from stream
await contract.withdrawFromStream(streamId)

// Cancel stream
await contract.cancelStream(streamId)

// Get stream balance
await contract.balanceOf(streamId)
```

### View Functions
```javascript
// Get user streams (outgoing)
await contract.getUserStreams(address)

// Get recipient streams (incoming)
await contract.getRecipientStreams(address)

// Get stream details
await contract.getStream(streamId)
```

## Use Cases

### Freelancing
- Client creates stream for project duration
- Freelancer withdraws daily
- Fair payment for time worked

### Subscriptions
- User creates monthly subscription stream
- Service provider receives continuous payment
- Auto-renew or cancel anytime

### Salaries
- Employer streams salary 24/7
- Employee withdraws anytime
- No waiting for payday

### Rentals
- Tenant streams rent per day
- Landlord receives continuous payment
- Cancel on move-out

## Performance Notes

- Stream calculations are gas-efficient
- Real-time updates every 2 seconds
- Optimized for thousands of concurrent streams
- Auto-accumulation of payments

## Security Features

- ✅ ReentrancyGuard on all state-changing functions
- ✅ Balance validation before transfers
- ✅ Fair cancellation logic
- ✅ Platform fee capped at 1%
- ✅ Event emissions for all actions

## Troubleshooting

### Stream won't create
- Check deposit amount matches duration * rate
- Ensure sufficient ETH balance
- Verify recipient address is valid

### Can't withdraw
- Ensure you're the recipient
- Check stream is active
- Verify accumulated balance > 0

### Cancel fails
- Must be sender or recipient
- Stream must be active
- Check transaction gas

## Advanced Features

### Auto-Compounding
Future: Auto-reinvest withdrawn funds

### Multi-Currency
Future: Support ERC20 tokens

### Scheduled Streams
Future: Start streams at specific time

### Stream Templates
Future: Save stream configurations

---

**Ready to deploy? Push to GitHub and import to Vercel!** 💸✨

