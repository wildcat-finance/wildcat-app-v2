import { Market } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { ExportChainId } from "@/lib/export/types"

import { ExportModal } from "./index"

type MarketExportModalProps = {
  market: Market
  open: boolean
  onClose: () => void
}

// The export dialog preset to one market. Callers gate it on
// isMarketExportSupported, which is what makes the chainId cast safe.
export const MarketExportModal = ({
  market,
  open,
  onClose,
}: MarketExportModalProps) => {
  const { address: connectedAddress } = useAccount()

  return (
    <ExportModal
      open={open}
      onClose={onClose}
      chainId={market.chainId as ExportChainId}
      marketAddress={market.address}
      borrowerAddress={market.borrower}
      defaultAddress={connectedAddress}
    />
  )
}
