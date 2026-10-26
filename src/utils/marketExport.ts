import { Market, MarketVersion } from "@wildcatfi/wildcat-sdk"

import { EXPORT_CHAIN_IDS } from "@/lib/export/types"

// Statements are built only for V2 markets on the chains the export service
// indexes; everywhere else the Export action is hidden.
export const isMarketExportSupported = (
  market: Pick<Market, "version" | "chainId">,
) =>
  market.version === MarketVersion.V2 &&
  EXPORT_CHAIN_IDS.some((chainId) => chainId === market.chainId)
