export async function waitForTxConfirmation(txId: string, maxAttempts = 20) {
  const url = `https://api.testnet.hiro.so/extended/v1/tx/${txId}`;
  console.log(`⏳ Waiting for tx ${txId} confirmation...`);

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(url);
    const data = await res.json();

    if (data.tx_status === "success") {
      console.log("✅ Transaction confirmed in block:", data.block_height);
      return true;
    }

    if (data.tx_status === "abort_by_response") {
      console.error("❌ Transaction failed:", data.tx_result);
      return false;
    }

    await new Promise((resolve) => setTimeout(resolve, 3000)); // wait 3s
  }

  console.warn("⚠️ Transaction confirmation timeout reached");
  return false;
}
