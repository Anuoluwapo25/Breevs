import Modal from "@/component/ResuableModal";
import GlowingEffect from "@/component/GlowingEffectProps";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther } from "viem";
import { useState, useEffect, useRef } from "react";
import { GameContract } from "@/component/index";
import { useRouter } from "next/navigation";

interface StakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  stakeAmount: string;
  onSuccess?: () => void;
}

const StakeModal: React.FC<StakeModalProps> = ({
  isOpen,
  onClose,
  stakeAmount,
  onSuccess,
}) => {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<`0x${string}` | null>(
    null
  );
  const [showManualProceed, setShowManualProceed] = useState(false);

  // Use a ref to track if component is mounted
  const isMounted = useRef(true);

  // Set up contract write function
  const { writeContractAsync } = useWriteContract();

  // Use wagmi's hook to wait for transaction receipt
  const {
    isLoading: isWaitingForReceipt,
    isSuccess: isTransactionSuccessful,
    isError: isTransactionError,
  } = useWaitForTransactionReceipt({
    hash: transactionHash as `0x${string}`,
    confirmations: 1,
  });

  // Clear states when unmounting
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Parse stake amount
  const parseStakeAmount = (amount: string): bigint => {
    const numericAmount = amount.replace(" CORE", "");
    return parseEther(numericAmount);
  };

  // Handle successful navigation
  const handleSuccessfulTransaction = () => {
    console.log("Handling successful transaction navigation");

    if (isMounted.current) {
      setIsProcessing(false);

      // Close modal first
      onClose();

      // Then navigate
      if (onSuccess) {
        onSuccess();
      } else {
        console.log("Navigating to GameScreen...");
        router.push("/GameScreen");
      }
    }
  };

  // Handle transaction status changes
  useEffect(() => {
    console.log("Transaction status:", {
      hash: transactionHash,
      isWaitingForReceipt,
      isTransactionSuccessful,
      isTransactionError,
    });

    // Handle successful transaction
    if (isTransactionSuccessful && transactionHash) {
      console.log("Transaction confirmed successfully!");
      handleSuccessfulTransaction();
    }

    // Handle transaction error
    if (isTransactionError && transactionHash) {
      console.log("Transaction failed!");
      if (isMounted.current) {
        setIsProcessing(false);
        setError("Transaction failed. Please try again.");
      }
    }
  }, [
    isWaitingForReceipt,
    isTransactionSuccessful,
    isTransactionError,
    transactionHash,
  ]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsProcessing(false);
      setTransactionHash(null);
      setShowManualProceed(false);
    }
  }, [isOpen]);

  // Add a timer to show manual proceed option
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (isProcessing && transactionHash && !isTransactionSuccessful) {
      // Show manual proceed option after 30 seconds
      timeoutId = setTimeout(() => {
        if (isMounted.current && !isTransactionSuccessful) {
          console.log("Showing manual proceed option");
          setShowManualProceed(true);
        }
      }, 30000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isProcessing, transactionHash, isTransactionSuccessful]);

  const handleStake = async () => {
    try {
      setError(null);
      setIsProcessing(true);
      setTransactionHash(null);
      setShowManualProceed(false);

      if (!isConnected) {
        setError("Please connect your wallet first");
        setIsProcessing(false);
        return;
      }

      const parsedAmount = parseStakeAmount(stakeAmount);

      console.log("Creating game with stake amount:", parsedAmount.toString());
      console.log("Contract address:", GameContract.address);
      console.log("Function:", "createGameRoom");

      // Submit transaction
      const hash = await writeContractAsync({
        address: GameContract.address as `0x${string}`,
        abi: GameContract.abi,
        functionName: "createGameRoom",
        args: [parsedAmount],
        value: parsedAmount,
      });

      console.log("Transaction submitted:", hash);

      // Store the hash to be monitored by useWaitForTransactionReceipt
      setTransactionHash(hash);
    } catch (err) {
      console.error("Stake error:", err);
      if (isMounted.current) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unknown error occurred");
        }
        setIsProcessing(false);
      }
    }
  };

  const handleManualProceed = () => {
    console.log("Manual proceed clicked");
    handleSuccessfulTransaction();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setIsProcessing(false);
        setTransactionHash(null);
        setShowManualProceed(false);
        onClose();
      }}
    >
      <div className="bg-[#0B1445] text-white text-center p-6 rounded-2xl">
        <GlowingEffect className="top-[63px] left-[47px]" />
        <h2 className="text-[25px] font-bold mb-4">Stake to WIN 1 CORE</h2>

        <p className="text-md mb-2 text-[#FF3B3B]">Amount available to stake</p>
        <div className="bg-white text-[#0B1445] py-1 px-15 rounded-lg mb-10 inline-block font-bold">
          {stakeAmount}
        </div>

        <p className="text-sm mb-4">
          You are about staking{" "}
          <span className="text-red-500 font-bold">{stakeAmount}</span> to win
          <span className="text-red-500 font-bold"> 1 CORE</span>, Kindly click
          on proceed to transaction to
          <span className="text-red-500 font-bold"> PLAY GAME</span>
        </p>

        {transactionHash && (
          <p className="text-blue-400 text-xs mb-2">
            Transaction Hash: {transactionHash.slice(0, 10)}...
            {transactionHash.slice(-8)}
          </p>
        )}

        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

        {!isConnected && (
          <p className="text-yellow-400 text-sm mb-2">
            Please connect your wallet to proceed
          </p>
        )}

        {showManualProceed && (
          <div className="mb-4 p-3 bg-yellow-900 rounded-lg">
            <p className="text-yellow-300 text-sm mb-2">
              Transaction is taking longer than expected. If your transaction
              was confirmed in your wallet, you can proceed manually.
            </p>
            <button
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-4 rounded text-sm"
              onClick={handleManualProceed}
            >
              Proceed to Game
            </button>
          </div>
        )}

        <button
          className={`bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-full w-full 
           shadow-[0_4px_0_#474d76] hover:shadow-[0_4px_0_#474d76] active:translate-y-1 transition-all mt-6
           ${isProcessing ? "opacity-70 cursor-not-allowed" : ""}`}
          onClick={handleStake}
          disabled={isProcessing || !isConnected}
        >
          {isProcessing ? "Processing..." : "Proceed to STAKE"}
        </button>
      </div>
    </Modal>
  );
};

export default StakeModal;
