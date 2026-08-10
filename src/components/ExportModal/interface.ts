import { ExportChainId } from "@/lib/export/types"

export type ExportModalProps = {
  open: boolean
  onClose: () => void
  chainId: ExportChainId
  marketAddress: string
  defaultAddress?: string
}
