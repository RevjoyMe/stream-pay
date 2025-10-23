import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import contractABI from './contract-abi.json'
import contractAddress from './contract-address.json'

const MEGAETH_CONFIG = {
  chainId: '0x18c6',
  chainName: 'MegaETH Testnet',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://carrot.megaeth.com/rpc'],
  blockExplorerUrls: ['https://megaexplorer.xyz']
}

function App() {
  const [account, setAccount] = useState(null)
  const [contract, setContract] = useState(null)
  const [view, setView] = useState('dashboard') // dashboard, create, streams
  const [loading, setLoading] = useState(false)
  
  const [streams, setStreams] = useState([])
  const [recipientStreams, setRecipientStreams] = useState([])
  const [balance, setBalance] = useState('0')

  // Form states
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [duration, setDuration] = useState('')
  const [durationType, setDurationType] = useState('hours') // hours, days, months

  useEffect(() => {
    checkWalletConnection()
  }, [])

  useEffect(() => {
    if (contract && account) {
      loadData()
      const interval = setInterval(loadData, 2000)
      return () => clearInterval(interval)
    }
  }, [contract, account])

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length > 0) {
        await connectWallet()
      }
    }
  }

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask!')
        return
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: MEGAETH_CONFIG.chainId }],
        })
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [MEGAETH_CONFIG],
          })
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contractInstance = new ethers.Contract(
        contractAddress.address,
        contractABI,
        signer
      )

      setAccount(accounts[0])
      setContract(contractInstance)
    } catch (error) {
      console.error('Error connecting wallet:', error)
    }
  }

  const loadData = async () => {
    if (!contract || !account) return

    try {
      // Load withdrawable balance
      const bal = await contract.balances(account)
      setBalance(ethers.formatEther(bal))

      // Load outgoing streams
      const userStreamIds = await contract.getUserStreams(account)
      const userStreamsData = await Promise.all(
        userStreamIds.map(async (id) => {
          const stream = await contract.getStream(id)
          const balances = await contract.balanceOf(id)
          return {
            id: Number(id),
            recipient: stream[1],
            deposit: ethers.formatEther(stream[2]),
            ratePerSecond: ethers.formatEther(stream[3]),
            startTime: Number(stream[4]),
            stopTime: Number(stream[5]),
            remainingBalance: ethers.formatEther(stream[6]),
            active: stream[7],
            recipientBalance: ethers.formatEther(balances[0]),
            senderBalance: ethers.formatEther(balances[1])
          }
        })
      )
      setStreams(userStreamsData)

      // Load incoming streams
      const recipientStreamIds = await contract.getRecipientStreams(account)
      const recipientStreamsData = await Promise.all(
        recipientStreamIds.map(async (id) => {
          const stream = await contract.getStream(id)
          const balances = await contract.balanceOf(id)
          return {
            id: Number(id),
            sender: stream[0],
            deposit: ethers.formatEther(stream[2]),
            ratePerSecond: ethers.formatEther(stream[3]),
            startTime: Number(stream[4]),
            stopTime: Number(stream[5]),
            remainingBalance: ethers.formatEther(stream[6]),
            active: stream[7],
            recipientBalance: ethers.formatEther(balances[0]),
            senderBalance: ethers.formatEther(balances[1])
          }
        })
      )
      setRecipientStreams(recipientStreamsData)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const createStream = async () => {
    if (!recipient || !amount || !duration) return
    
    setLoading(true)
    try {
      let durationInSeconds = parseInt(duration)
      
      if (durationType === 'hours') {
        durationInSeconds *= 3600
      } else if (durationType === 'days') {
        durationInSeconds *= 86400
      } else if (durationType === 'months') {
        durationInSeconds *= 2592000 // 30 days
      }

      const totalAmount = ethers.parseEther(amount)
      const ratePerSecond = totalAmount / BigInt(durationInSeconds)

      const tx = await contract.createStream(
        recipient,
        durationInSeconds,
        ratePerSecond,
        { value: totalAmount }
      )
      await tx.wait()
      
      setRecipient('')
      setAmount('')
      setDuration('')
      setView('dashboard')
      await loadData()
      alert('Stream created successfully!')
    } catch (error) {
      console.error('Error creating stream:', error)
      alert(error.reason || 'Failed to create stream')
    } finally {
      setLoading(false)
    }
  }

  const withdrawFromStream = async (streamId) => {
    setLoading(true)
    try {
      const tx = await contract.withdrawFromStream(streamId)
      await tx.wait()
      await loadData()
      alert('Withdrawal successful!')
    } catch (error) {
      console.error('Error withdrawing:', error)
      alert(error.reason || 'Withdrawal failed')
    } finally {
      setLoading(false)
    }
  }

  const cancelStream = async (streamId) => {
    if (!confirm('Are you sure you want to cancel this stream?')) return
    
    setLoading(true)
    try {
      const tx = await contract.cancelStream(streamId)
      await tx.wait()
      await loadData()
      alert('Stream cancelled')
    } catch (error) {
      console.error('Error cancelling stream:', error)
      alert(error.reason || 'Cancellation failed')
    } finally {
      setLoading(false)
    }
  }

  const withdrawBalance = async () => {
    setLoading(true)
    try {
      const tx = await contract.withdraw()
      await tx.wait()
      await loadData()
      alert('Balance withdrawn!')
    } catch (error) {
      console.error('Error withdrawing balance:', error)
      alert(error.reason || 'Withdrawal failed')
    } finally {
      setLoading(false)
    }
  }

  const getProgress = (stream) => {
    const now = Math.floor(Date.now() / 1000)
    if (now >= stream.stopTime) return 100
    const elapsed = now - stream.startTime
    const total = stream.stopTime - stream.startTime
    return (elapsed / total) * 100
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 24) {
      return `${Math.floor(hours / 24)}d ${hours % 24}h`
    }
    return `${hours}h ${minutes}m`
  }

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md">
          <div className="text-6xl mb-4">💸</div>
          <h1 className="text-4xl font-bold mb-4">StreamPay</h1>
          <p className="text-gray-600 mb-6">Real-time streaming payments on MegaETH</p>
          <button
            onClick={connectWallet}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full font-bold hover:shadow-lg transition"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">💸 StreamPay</h1>
              <p className="text-gray-600">
                {account.slice(0, 6)}...{account.slice(-4)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Withdrawable Balance</p>
              <p className="text-3xl font-bold">{parseFloat(balance).toFixed(6)} ETH</p>
              {parseFloat(balance) > 0 && (
                <button
                  onClick={withdrawBalance}
                  disabled={loading}
                  className="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition disabled:opacity-50"
                >
                  Withdraw
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setView('dashboard')}
            className={`flex-1 py-3 rounded-xl font-bold transition ${
              view === 'dashboard'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setView('create')}
            className={`flex-1 py-3 rounded-xl font-bold transition ${
              view === 'create'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            Create Stream
          </button>
        </div>

        {/* Dashboard View */}
        {view === 'dashboard' && (
          <div className="space-y-6">
            {/* Outgoing Streams */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="text-2xl font-bold mb-4">📤 Outgoing Streams</h2>
              {streams.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No outgoing streams</p>
              ) : (
                <div className="space-y-4">
                  {streams.map(stream => (
                    <div key={stream.id} className="border rounded-xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm text-gray-600">To</p>
                          <p className="font-mono font-bold">{stream.recipient.slice(0, 10)}...</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Rate</p>
                          <p className="font-bold">{(parseFloat(stream.ratePerSecond) * 3600).toFixed(6)} ETH/h</p>
                        </div>
                      </div>

                      {stream.active && (
                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{getProgress(stream).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full progress-bar animate-flow"
                              style={{ width: `${getProgress(stream)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-gray-600">Streamed</p>
                          <p className="font-bold">{stream.recipientBalance} ETH</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Remaining</p>
                          <p className="font-bold">{stream.senderBalance} ETH</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Start</p>
                          <p className="font-bold">{formatTime(stream.startTime)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">End</p>
                          <p className="font-bold">{formatTime(stream.stopTime)}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {stream.active && (
                          <button
                            onClick={() => cancelStream(stream.id)}
                            disabled={loading}
                            className="flex-1 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                        {!stream.active && (
                          <div className="flex-1 py-2 bg-gray-300 text-gray-600 rounded-lg font-bold text-center">
                            Completed
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Incoming Streams */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="text-2xl font-bold mb-4">📥 Incoming Streams</h2>
              {recipientStreams.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No incoming streams</p>
              ) : (
                <div className="space-y-4">
                  {recipientStreams.map(stream => (
                    <div key={stream.id} className="border rounded-xl p-4 bg-green-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm text-gray-600">From</p>
                          <p className="font-mono font-bold">{stream.sender.slice(0, 10)}...</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Rate</p>
                          <p className="font-bold">{(parseFloat(stream.ratePerSecond) * 3600).toFixed(6)} ETH/h</p>
                        </div>
                      </div>

                      {stream.active && (
                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{getProgress(stream).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full progress-bar animate-flow"
                              style={{ width: `${getProgress(stream)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="mb-3 p-3 bg-white rounded-lg">
                        <p className="text-sm text-gray-600">Available to Withdraw</p>
                        <p className="text-2xl font-bold text-green-600">{stream.recipientBalance} ETH</p>
                      </div>

                      <div className="flex gap-2">
                        {stream.active && parseFloat(stream.recipientBalance) > 0 && (
                          <button
                            onClick={() => withdrawFromStream(stream.id)}
                            disabled={loading}
                            className="flex-1 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition disabled:opacity-50"
                          >
                            Withdraw
                          </button>
                        )}
                        {stream.active && (
                          <button
                            onClick={() => cancelStream(stream.id)}
                            disabled={loading}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Stream View */}
        {view === 'create' && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Create Payment Stream</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Recipient Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Total Amount (ETH)</label>
                <input
                  type="number"
                  placeholder="0.1"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Duration</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="1"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <select
                    value={durationType}
                    onChange={(e) => setDurationType(e.target.value)}
                    className="px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>

              {amount && duration && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Streaming Rate</p>
                  <p className="text-xl font-bold">
                    {(parseFloat(amount) / (parseInt(duration) * (durationType === 'hours' ? 1 : durationType === 'days' ? 24 : 720))).toFixed(6)} ETH/hour
                  </p>
                </div>
              )}

              <button
                onClick={createStream}
                disabled={loading || !recipient || !amount || !duration}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-bold hover:shadow-lg transition disabled:opacity-50"
              >
                {loading ? 'Creating Stream...' : 'Create Stream'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App

