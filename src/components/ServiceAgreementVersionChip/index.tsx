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

export type ServiceAgreementVersionChipTone = "default" | "stale" | "current"

// Colour pairs follow the app's status-chip language: stale mirrors the muted
// "Terminated" treatment, current mirrors the "Healthy" treatment.
const TONE_SX: Record<
  ServiceAgreementVersionChipTone,
  { backgroundColor: string; color: string }
> = {
  default: { backgroundColor: COLORS.blackRock006, color: COLORS.blackRock },
  stale: { backgroundColor: COLORS.whiteSmoke, color: COLORS.santasGrey },
  current: { backgroundColor: COLORS.glitter, color: COLORS.ultramarineBlue },
}

/// Generic pill in the version-chip style; used for the companion date chips.
export const ServiceAgreementChip = ({
  label,
  tone = "default",
  title,
}: {
  label: string
  tone?: ServiceAgreementVersionChipTone
  title?: string
}) => (
  <Box sx={{ ...VersionChipSx, ...TONE_SX[tone] }} title={title}>
    {label}
  </Box>
)

export const ServiceAgreementVersionChip = ({
  version,
  tone = "default",
}: {
  version: string | undefined
  tone?: ServiceAgreementVersionChipTone
}) => {
  if (!version) return null

  return (
    <ServiceAgreementChip
      label={formatServiceAgreementVersionLabel(version)}
      title={version}
      tone={tone}
    />
  )
}
