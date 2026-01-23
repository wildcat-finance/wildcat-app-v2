import { Box, Divider, Typography } from "@mui/material"

import { AurosEthenaBanner } from "@/components/AdsBanners/AurosEthena/AurosEthenaBanner"
import { AurosEthenaProposalChip } from "@/components/AdsBanners/AurosEthena/AurosEthenaProposalChip"
import { TooltipButton } from "@/components/TooltipButton"
import { COLORS } from "@/theme/colors"

export const AurosEthenaMobileContent = ({ baseAPR }: { baseAPR: string }) => {
  const a = "a"

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <AurosEthenaProposalChip isTooltip={false} />

      <AurosEthenaBanner maxWidth="100%" />
    </Box>
  )

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        marginBottom: "14px",
      }}
    >
      <Box
        sx={{ display: "flex", alignItems: "center", mt: "14px", mb: "14px" }}
      >
        <Typography variant="mobText4" sx={{ mr: "4px" }}>
          Base APR
        </Typography>

        <Box
          sx={{
            padding: "0 6px",
            borderRadius: "12px",
            backgroundColor: COLORS.whiteSmoke,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mr: "6px",
          }}
        >
          <Typography variant="text4">{baseAPR}%</Typography>
        </Box>

        <AurosEthenaProposalChip isTooltip={false} />

        <Box ml="4px">
          <TooltipButton
            value="Lenders may receive additional incentives distributed by external
            partners or protocol initiatives. These incentives are optional,
            variable, and not part of the core lending terms. Wildcat does not
            guarantee the program and accepts no liability."
          />
        </Box>
      </Box>

      <AurosEthenaBanner maxWidth="100%" />

      <Divider sx={{ marginTop: "14px" }} />
    </Box>
  )
}
