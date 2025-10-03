# 🎮 Breevs - Russian Roulette

**Breevs - Russian Roulette** is a decentralized web application where users participate in a high-stakes elimination game built on **Core Testnet**.  

Players stake tokens to join a game room, and one by one, they are eliminated through a randomized process until only one player remains — who claims the entire prize pool.  

The game logic is powered by a smart contract deployed to Core Testnet, ensuring **transparency, fairness, and tamper-proof gameplay**.  

---

## 🚀 Features

- **Game Creation**  
  A player initiates a new game room, specifying the stake amount required to join. The creator automatically deposits the stake when creating the room.

- **Multi-Player Support**  
  Up to **5 players** (creator + 4 others) can join a game room by sending the required stake amount.

- **Game Start**  
  Once 5 players have joined, anyone can trigger the game to start. All staked tokens are held securely by the smart contract.

- **Russian Roulette Rounds**  
  Each round, the roulette is spun to randomly eliminate one player using `block.prevrandao`.  
  The process repeats until only one winner remains.

- **Winner Takes All**  
  The final player standing wins the entire prize pool (all 5 players' stakes combined).

---

## 🛠 Contract Structure

### State Variables
- **Players:** Tracks all players who have joined each game.  
- **Stake:** The fixed amount each player must deposit to join.  
- **Game State:** Tracks each game’s lifecycle (`Active`, `In Progress`, `Completed`).  

### Functions
- `createGame`: Starts a new game room with a unique room ID.  
- `joinGame`: Allows players to join an active room if space is available.  
- `startGame`: Begins the roulette process once 5 players have joined.  
- `spin`: Eliminates a player at random.  
- `claimWinnings`: Allows the final player to withdraw the full prize pool.  

---

## 🌐 Contract Deployment

- **Network:** Core Testnet  
- **Contract Address:** `0x836E78d3059a17E9D11C509c0b82782490B9d84D`  
- **Explorer:** [View on Core Testnet Explorer](https://scan.coredao.org/)  

---

## 🤝 How to Contribute

### Prerequisites
- Core Testnet wallet (for staking tokens)  
- Basic understanding of **Hardhat** and smart contract development  
- Familiarity with **web3.js** or **ethers.js** (for front-end interaction)  

### Steps to Contribute
1. Fork the repository and clone it locally.  
2. Install dependencies:  
   ```bash
   npm install
