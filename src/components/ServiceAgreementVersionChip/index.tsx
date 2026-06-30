import { Box } from "@mui/material"

import { COLORS } from "@/theme/colors"
import { formatServiceAgreementVersionLabel } from "@/utils/serviceAgreementVersions"

const VersionChipSx = {
  height: "22px",
  display: "inline-flex",
  alignItems: "center",
  padding: "0 8px",
  borderRadius: "999px",
  backgroundColor: COLORS.blackRock006,
  color: COLORS.blackRock,
  fontSize: "11px",
  lineHeight: "16px",
  fontWeight: 600,
  letterSpacing: "0.2px",
  transform: "translateY(-1px)",
  whiteSpace: "nowrap",
}

export const ServiceAgreementVersionChip = ({
  version,
}: {
  version: string | undefined
}) => {
  if (!version) return null

  return (
    <Box sx={VersionChipSx}>{formatServiceAgreementVersionLabel(version)}</Box>
  )
}
