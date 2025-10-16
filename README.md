# 🎮 Breevs - Russian Roulette

**Breevs - Russian Roulette** is a decentralized web application built on the **Stacks blockchain** where users participate in a high-stakes elimination game powered by **Clarity smart contracts**.

Players stake **STX tokens** to join a game room, and through a cryptographically secure randomized elimination process using Stacks' block data, players are eliminated one by one until only one survivor remains to claim the entire prize pool.

The game ensures **transparency, fairness, and tamper-proof gameplay** through on-chain verification and Leather wallet integration.

---

## 🚀 Features

### 🎯 Core Gameplay
- **Game Creation**: Create new game rooms with custom STX stake amounts
- **Multi-Player Support**: Up to **5 players** per game (creator + 4 joiners)
- **Automatic Start**: Game begins once maximum players join
- **Russian Roulette Rounds**: Random elimination using Stacks block data
- **Winner Takes All**: Final survivor claims entire prize pool (5 × stake)

### 🔒 Security & Fairness
- **On-Chain Randomness**: Uses `burn-block-time` and `block-height` for verifiable randomness
- **Transparent Gameplay**: All actions recorded on Stacks blockchain
- **Tamper-Proof**: Smart contract enforces game rules
- **STX Native**: Direct STX transfers for stakes and payouts

### 💼 Wallet Integration
- **Leather Wallet**: Official Stacks wallet for seamless experience
- **Stacks Connect SDK**: Easy authentication and transaction signing
- **Multi-Signature Ready**: Contract supports future multi-sig enhancements

---

## 🛠️ Technical Architecture

```
;; Key Contract Functions
(define-public (create-game (stake-amount: uint))
  ;; Initialize new game room
)

(define-public (join-game (game-id: uint))
  ;; Players deposit STX and join
  (contract-call? .stx-token transfer stake-amount tx-sender (as-contract tx-sender) none)
)

(define-public (spin-roulette (game-id: uint))
  ;; Cryptographically secure elimination
  (let ((randomness (get-secure-random game-id)))
    (eliminate-player game-id randomness)
  )
)

(define-public (claim-prize (game-id: uint))
  ;; Winner withdraws entire pool
)
```
---

## 🌐 Contract Deployment

- **Network:** stacks Testnet  
- **Contract Address:** `ST168JS95Y70CV8T7T63GF8V420FG2VCBZ5TXP2DA`  
- **Explorer:** [View on Core Testnet Explorer](https://explorer.hiro.so/address/ST168JS95Y70CV8T7T63GF8V420FG2VCBZ5TXP2DA?chain=testnet)  

---

## 🤝 How to Contribute

### Prerequisites
- Stacks Testnet(STK) wallet (for staking tokens)  
- Basic understanding of **Hardhat** and smart contract development  
- Familiarity with **web3.js** or **ethers.js** (for front-end interaction)  


