import { Address } from "viem";
import GameABI from "../ABI/GameABI.json";

export const GAME_CONTRACT_ADDRESS =
  "0x836E78d3059a17E9D11C509c0b82782490B9d84D" as Address;

interface ContractConfig {
  address: Address;
  abi: any;
}

export const gameConfig: ContractConfig = {
  address: GAME_CONTRACT_ADDRESS,
  abi: GameABI,
};
