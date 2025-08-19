# SeaChainTrace

A blockchain-powered platform for sustainable fishing and aquaculture that ensures traceability, rewards eco-friendly practices, and empowers small-scale producers through transparent supply chains and community governance — all on-chain using Clarity on the Stacks blockchain.

---

## Overview

SeaChainTrace addresses real-world challenges in fishing and aquaculture, such as overfishing, lack of supply chain transparency, and unfair market access for artisanal fishermen. By leveraging blockchain, it provides verifiable traceability for seafood products, incentivizes sustainable methods (e.g., adhering to catch limits and eco-certifications), and enables direct peer-to-peer trading. This reduces fraud, supports biodiversity, and connects consumers with ethically sourced products.

The platform consists of four main smart contracts that form a decentralized, transparent, and rewarding ecosystem:

1. **Traceability NFT Contract** – Manages NFTs representing batches of fish or aquaculture products for end-to-end tracking.
2. **Sustainability Token Contract** – Issues and distributes tokens to reward verified sustainable practices.
3. **Governance DAO Contract** – Allows stakeholders to vote on sustainability standards and resource management.
4. **Marketplace Contract** – Facilitates secure, automated trading of traceable seafood with royalty splits.

---

## Features

- **NFT-based traceability** for fish batches from catch/farm to consumer  
- **Reward tokens** for sustainable fishing/aquaculture verified via oracles  
- **DAO governance** for community-driven policies on quotas and certifications  
- **Decentralized marketplace** for direct sales with automated payments and royalties  
- **Integration with off-chain data** for real-time verification of catch locations, water quality, and compliance  
- **Anti-fraud measures** to prevent double-counting or false claims in supply chains  
- **Royalty distributions** to support local communities and conservation efforts  

---

## Smart Contracts

### Traceability NFT Contract
- Mint NFTs for fish batches with metadata (e.g., origin, catch date, method, certifications)
- Track transfers and updates along the supply chain (e.g., processing, shipping)
- Immutable audit trails for compliance and consumer verification

### Sustainability Token Contract
- Mint, burn, and transfer reward tokens based on verified actions
- Staking mechanisms for additional yields from conservation pools
- Token distribution rules tied to oracle-fed data (e.g., sustainable yield reports)

### Governance DAO Contract
- Token-weighted voting on proposals (e.g., updating fishing quotas or certification criteria)
- On-chain execution of approved decisions
- Quorum requirements and proposal lifecycle management

### Marketplace Contract
- List and trade traceable NFTs with automated escrow
- Royalty splits for sellers, communities, and platform treasury
- Integration with traceability contract for verified listings only

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started)
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/seachaintrace.git
   ```
3. Run tests:
    ```bash
    npm test
    ```
4. Deploy contracts:
    ```bash
    clarinet deploy
    ```

## Usage

Each smart contract operates independently but integrates with others for a complete sustainable seafood ecosystem.
Refer to individual contract documentation for function calls, parameters, and usage examples.

## License

MIT License
