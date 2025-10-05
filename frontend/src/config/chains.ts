import { defineChain } from "viem";

export const coreTestnet = defineChain({
  id: 1115,
  name: "Core Testnet",
  nativeCurrency: {
    name: "Core",
    symbol: "tCORE",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc.test.btcs.network"] },
    public: { http: ["https://rpc.test.btcs.network"] },
  },
  blockExplorers: {
    default: {
      name: "Core Testnet Explorer",
      url: "https://scan.test.btcs.network",
    },
  },
  testnet: true,
});
