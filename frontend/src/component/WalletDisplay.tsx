import { useAccount, useBalance, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUnlink } from "@fortawesome/free-solid-svg-icons";
import { Open_Sans } from "next/font/google";

const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "700"] });

interface WalletDisplayProps {
  showBalance?: boolean; // NEW
}

const WalletDisplay: React.FC<WalletDisplayProps> = ({
  showBalance = true,
}) => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { disconnect } = useDisconnect();

  return (
    <div className="flex flex-col items-center space-y-3">
      {isConnected ? (
        <>
          {/* Address Bar */}
          <div className="flex items-center justify-center text-white space-x-3 bg-[#191f57] px-8 py-2 rounded-full z-40">
            <Wallet />
            <span className={`${openSans.className}`}>
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
            <button onClick={() => disconnect()} className="relative group">
              <FontAwesomeIcon icon={faUnlink} />
              {/* Tooltip */}
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                Disconnect
              </span>
            </button>
          </div>

          {/* Balance (optional) */}
          {showBalance && (
            <div
              className={`${openSans.className} bg-gray-300 rounded-full text-sm py-1 px-4 font-semibold text-[#1B225D]`}
            >
              Balance:
              <span className="text-red-500 ml-1">
                {balance?.formatted} CORE
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="custom-connect">
          <ConnectButton />
        </div>
      )}
    </div>
  );
};

export default WalletDisplay;
