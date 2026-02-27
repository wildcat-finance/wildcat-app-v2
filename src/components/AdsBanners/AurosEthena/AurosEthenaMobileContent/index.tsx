import { Box } from "@mui/material"

import { AurosEthenaBanner } from "@/components/AdsBanners/AurosEthena/AurosEthenaBanner"
import { AurosEthenaProposalChip } from "@/components/AdsBanners/AurosEthena/AurosEthenaProposalChip"

export const AurosEthenaMobileContent = ({
  tokenAmount,
}: {
  tokenAmount: string
}) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: "14px" }}>
    <AurosEthenaProposalChip isTooltip={false} />

    <AurosEthenaBanner maxWidth="100%" tokenAmount={tokenAmount} />
  </Box>
)
