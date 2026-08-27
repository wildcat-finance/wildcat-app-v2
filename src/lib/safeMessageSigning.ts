import SafeAppsSDK from "@safe-global/safe-apps-sdk"

export type ProposedSafeMessage =
  | { kind: "offchain"; messageHash: string }
  | { kind: "onchain"; safeTxHash: string }

/** Initiate Safe message signing and normalize the SDK's declared response. */
export async function proposeSafeMessage(
  sdk: SafeAppsSDK,
  message: string,
): Promise<ProposedSafeMessage> {
  await sdk.eth.setSafeSettings([{ offChainSigning: true }])
  const result = await sdk.txs.signMessage(message)
  if ("messageHash" in result) {
    return { kind: "offchain", messageHash: result.messageHash }
  }
  return { kind: "onchain", safeTxHash: result.safeTxHash }
}

export const getPendingSafeMessageId = ({
  chainId,
  address,
  proposal,
}: {
  chainId: number
  address: string
  proposal: ProposedSafeMessage
}) =>
  [
    chainId,
    address.toLowerCase(),
    proposal.kind,
    proposal.kind === "offchain" ? proposal.messageHash : proposal.safeTxHash,
  ].join(":")
