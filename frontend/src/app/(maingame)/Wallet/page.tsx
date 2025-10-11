"use client";

import BackgroundImg from "@/component/BackgroundImg";
import WalletDisplay from "@/component/WalletDisplay";
import { Open_Sans } from "next/font/google";

const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "700"] });

const Wallet: React.FC = () => {
  return (
    <BackgroundImg>
      <div className="mb-[50px]">
        <WalletDisplay />
      </div>

      <div
        className={`${openSans.className} text-white flex flex-col justify-center text-start max-w-md mx-auto space-y-4`}
      >
        <span className="text-lg font-bold text-start">Play & Win Rewards</span>
        <p className="text-sm leading-relaxed">
          Enter the Breevs arena — a high-stakes elimination game where players
          risk and win tokens through luck and strategy. Connect your Stacks
          wallet to join or host a match on the testnet.
        </p>
      </div>

      <div
        className={`${openSans.className}
        z-40 bg-[#a6c4ea] text-[#1B225D] rounded-full px-8 py-1 text-lg 
        shadow-2xl relative cursor-pointer transition-all duration-200 
        hover:shadow-xl hover:-translate-y-1 hover:bg-gray-100 hover:text-black
        active:scale-95 active:shadow-md mt-[70px]`}
      >
        Having Trouble?
        <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent rounded-full pointer-events-none"></div>
      </div>
    </BackgroundImg>
  );
};

export default Wallet;
