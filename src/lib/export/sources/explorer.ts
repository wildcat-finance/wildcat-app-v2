import { createBlockscoutExplorer } from "./blockscout"
import { etherscanExplorer, ExportExplorer } from "./etherscan"
import { EXPORT_CHAIN_IDS, ExportChainId } from "../types"

export function createExportExplorer(chainId: ExportChainId): ExportExplorer {
  if (chainId === 763373) return createBlockscoutExplorer()
  if (EXPORT_CHAIN_IDS.some((id) => id === chainId)) return etherscanExplorer
  throw new Error(`No export explorer configured for chain ${chainId}`)
}
