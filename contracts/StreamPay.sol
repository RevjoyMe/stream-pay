// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StreamPay
 * @dev Streaming micropayments protocol on MegaETH
 * Real-time payment streaming with per-second precision
 */
contract StreamPay is Ownable, ReentrancyGuard {
    struct Stream {
        uint256 id;
        address sender;
        address recipient;
        uint256 deposit;
        uint256 ratePerSecond;
        uint256 startTime;
        uint256 stopTime;
        uint256 remainingBalance;
        bool active;
    }

    struct Subscription {
        uint256 id;
        address subscriber;
        address provider;
        uint256 ratePerSecond;
        uint256 lastPaymentTime;
        bool active;
    }

    mapping(uint256 => Stream) public streams;
    mapping(uint256 => Subscription) public subscriptions;
    mapping(address => uint256[]) public userStreams; // sender's streams
    mapping(address => uint256[]) public recipientStreams; // recipient's streams
    mapping(address => uint256[]) public userSubscriptions;
    mapping(address => uint256) public balances; // withdrawable balances

    uint256 public nextStreamId = 1;
    uint256 public nextSubscriptionId = 1;
    uint256 public platformFee = 10; // 0.1% (10/10000)

    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 deposit,
        uint256 ratePerSecond,
        uint256 startTime,
        uint256 stopTime
    );
    
    event StreamWithdrawn(
        uint256 indexed streamId,
        address indexed recipient,
        uint256 amount
    );
    
    event StreamCancelled(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 senderBalance,
        uint256 recipientBalance
    );

    event SubscriptionCreated(
        uint256 indexed subscriptionId,
        address indexed subscriber,
        address indexed provider,
        uint256 ratePerSecond
    );

    event SubscriptionPayment(
        uint256 indexed subscriptionId,
        address indexed subscriber,
        address indexed provider,
        uint256 amount
    );

    event SubscriptionCancelled(
        uint256 indexed subscriptionId,
        address indexed subscriber
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Create a payment stream
     * @param recipient Address to stream to
     * @param duration Duration in seconds
     * @param ratePerSecond Payment rate per second in wei
     */
    function createStream(
        address recipient,
        uint256 duration,
        uint256 ratePerSecond
    ) external payable nonReentrant returns (uint256) {
        require(recipient != address(0), "Invalid recipient");
        require(recipient != msg.sender, "Cannot stream to yourself");
        require(duration > 0, "Duration must be > 0");
        require(ratePerSecond > 0, "Rate must be > 0");

        uint256 deposit = ratePerSecond * duration;
        require(msg.value >= deposit, "Insufficient deposit");

        uint256 streamId = nextStreamId++;
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + duration;

        streams[streamId] = Stream({
            id: streamId,
            sender: msg.sender,
            recipient: recipient,
            deposit: deposit,
            ratePerSecond: ratePerSecond,
            startTime: startTime,
            stopTime: stopTime,
            remainingBalance: deposit,
            active: true
        });

        userStreams[msg.sender].push(streamId);
        recipientStreams[recipient].push(streamId);

        // Refund excess
        if (msg.value > deposit) {
            payable(msg.sender).transfer(msg.value - deposit);
        }

        emit StreamCreated(streamId, msg.sender, recipient, deposit, ratePerSecond, startTime, stopTime);
        return streamId;
    }

    /**
     * @dev Calculate available balance for a stream
     */
    function balanceOf(uint256 streamId) public view returns (uint256 recipientBalance, uint256 senderBalance) {
        Stream storage stream = streams[streamId];
        require(stream.id != 0, "Stream doesn't exist");

        if (!stream.active) {
            return (0, stream.remainingBalance);
        }

        uint256 elapsedTime;
        if (block.timestamp >= stream.stopTime) {
            elapsedTime = stream.stopTime - stream.startTime;
        } else {
            elapsedTime = block.timestamp - stream.startTime;
        }

        uint256 earned = elapsedTime * stream.ratePerSecond;
        
        if (earned >= stream.deposit) {
            recipientBalance = stream.remainingBalance;
            senderBalance = 0;
        } else {
            recipientBalance = earned;
            senderBalance = stream.deposit - earned;
        }

        return (recipientBalance, senderBalance);
    }

    /**
     * @dev Withdraw from stream (recipient)
     */
    function withdrawFromStream(uint256 streamId) external nonReentrant {
        Stream storage stream = streams[streamId];
        require(stream.recipient == msg.sender, "Not stream recipient");
        require(stream.active, "Stream not active");

        (uint256 recipientBalance, ) = balanceOf(streamId);
        require(recipientBalance > 0, "Nothing to withdraw");

        uint256 fee = (recipientBalance * platformFee) / 10000;
        uint256 netAmount = recipientBalance - fee;

        stream.remainingBalance -= recipientBalance;

        if (block.timestamp >= stream.stopTime || stream.remainingBalance == 0) {
            stream.active = false;
        }

        balances[owner()] += fee;
        payable(msg.sender).transfer(netAmount);

        emit StreamWithdrawn(streamId, msg.sender, netAmount);
    }

    /**
     * @dev Cancel stream (sender or recipient)
     */
    function cancelStream(uint256 streamId) external nonReentrant {
        Stream storage stream = streams[streamId];
        require(
            stream.sender == msg.sender || stream.recipient == msg.sender,
            "Not authorized"
        );
        require(stream.active, "Stream not active");

        (uint256 recipientBalance, uint256 senderBalance) = balanceOf(streamId);

        stream.active = false;
        stream.remainingBalance = 0;

        if (recipientBalance > 0) {
            uint256 fee = (recipientBalance * platformFee) / 10000;
            uint256 netAmount = recipientBalance - fee;
            balances[owner()] += fee;
            payable(stream.recipient).transfer(netAmount);
        }

        if (senderBalance > 0) {
            payable(stream.sender).transfer(senderBalance);
        }

        emit StreamCancelled(streamId, stream.sender, stream.recipient, senderBalance, recipientBalance);
    }

    /**
     * @dev Create subscription
     */
    function createSubscription(
        address provider,
        uint256 ratePerSecond
    ) external payable nonReentrant returns (uint256) {
        require(provider != address(0), "Invalid provider");
        require(provider != msg.sender, "Cannot subscribe to yourself");
        require(ratePerSecond > 0, "Rate must be > 0");
        require(msg.value > 0, "Must deposit funds");

        uint256 subscriptionId = nextSubscriptionId++;

        subscriptions[subscriptionId] = Subscription({
            id: subscriptionId,
            subscriber: msg.sender,
            provider: provider,
            ratePerSecond: ratePerSecond,
            lastPaymentTime: block.timestamp,
            active: true
        });

        userSubscriptions[msg.sender].push(subscriptionId);
        balances[msg.sender] += msg.value;

        emit SubscriptionCreated(subscriptionId, msg.sender, provider, ratePerSecond);
        return subscriptionId;
    }

    /**
     * @dev Process subscription payment
     */
    function processSubscriptionPayment(uint256 subscriptionId) external nonReentrant {
        Subscription storage sub = subscriptions[subscriptionId];
        require(sub.active, "Subscription not active");

        uint256 elapsedTime = block.timestamp - sub.lastPaymentTime;
        uint256 payment = elapsedTime * sub.ratePerSecond;

        require(balances[sub.subscriber] >= payment, "Insufficient balance");

        balances[sub.subscriber] -= payment;
        
        uint256 fee = (payment * platformFee) / 10000;
        uint256 netPayment = payment - fee;

        balances[owner()] += fee;
        payable(sub.provider).transfer(netPayment);

        sub.lastPaymentTime = block.timestamp;

        emit SubscriptionPayment(subscriptionId, sub.subscriber, sub.provider, netPayment);
    }

    /**
     * @dev Cancel subscription
     */
    function cancelSubscription(uint256 subscriptionId) external nonReentrant {
        Subscription storage sub = subscriptions[subscriptionId];
        require(sub.subscriber == msg.sender || sub.provider == msg.sender, "Not authorized");
        require(sub.active, "Already cancelled");

        // Process final payment
        if (balances[sub.subscriber] > 0) {
            uint256 elapsedTime = block.timestamp - sub.lastPaymentTime;
            uint256 payment = elapsedTime * sub.ratePerSecond;

            if (payment > 0 && balances[sub.subscriber] >= payment) {
                balances[sub.subscriber] -= payment;
                uint256 fee = (payment * platformFee) / 10000;
                uint256 netPayment = payment - fee;
                balances[owner()] += fee;
                payable(sub.provider).transfer(netPayment);
            }
        }

        sub.active = false;

        emit SubscriptionCancelled(subscriptionId, sub.subscriber);
    }

    /**
     * @dev Top up subscription balance
     */
    function topUpSubscription(uint256 subscriptionId) external payable {
        Subscription storage sub = subscriptions[subscriptionId];
        require(sub.subscriber == msg.sender, "Not subscriber");
        require(sub.active, "Subscription not active");
        require(msg.value > 0, "Must send ETH");

        balances[msg.sender] += msg.value;
    }

    /**
     * @dev Withdraw balance
     */
    function withdraw() external nonReentrant {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "No balance");

        balances[msg.sender] = 0;
        payable(msg.sender).transfer(balance);
    }

    /**
     * @dev Get user's streams
     */
    function getUserStreams(address user) external view returns (uint256[] memory) {
        return userStreams[user];
    }

    /**
     * @dev Get recipient's streams
     */
    function getRecipientStreams(address recipient) external view returns (uint256[] memory) {
        return recipientStreams[recipient];
    }

    /**
     * @dev Get user's subscriptions
     */
    function getUserSubscriptions(address user) external view returns (uint256[] memory) {
        return userSubscriptions[user];
    }

    /**
     * @dev Get stream details
     */
    function getStream(uint256 streamId) external view returns (
        address sender,
        address recipient,
        uint256 deposit,
        uint256 ratePerSecond,
        uint256 startTime,
        uint256 stopTime,
        uint256 remainingBalance,
        bool active
    ) {
        Stream storage stream = streams[streamId];
        return (
            stream.sender,
            stream.recipient,
            stream.deposit,
            stream.ratePerSecond,
            stream.startTime,
            stream.stopTime,
            stream.remainingBalance,
            stream.active
        );
    }

    /**
     * @dev Get subscription details
     */
    function getSubscription(uint256 subscriptionId) external view returns (
        address subscriber,
        address provider,
        uint256 ratePerSecond,
        uint256 lastPaymentTime,
        bool active,
        uint256 pendingPayment
    ) {
        Subscription storage sub = subscriptions[subscriptionId];
        uint256 elapsedTime = block.timestamp - sub.lastPaymentTime;
        uint256 pending = elapsedTime * sub.ratePerSecond;
        
        return (
            sub.subscriber,
            sub.provider,
            sub.ratePerSecond,
            sub.lastPaymentTime,
            sub.active,
            pending
        );
    }

    /**
     * @dev Set platform fee (only owner)
     */
    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = newFee;
    }
}

