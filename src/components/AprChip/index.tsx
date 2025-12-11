import { ReactNode } from "react"

import { Box, SvgIcon, Tooltip, Typography } from "@mui/material"

import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

type AprChipProps = {
  baseApr: string
  isBonus?: boolean
  bonusApr?: string
  rightGap?: number
  icons?: JSX.Element[]
  adsComponent?: ReactNode
}

export const AprChip = ({
  isBonus = false,
  baseApr,
  bonusApr,
  rightGap = 42.5,
  icons,
  adsComponent,
}: AprChipProps) => {
  const isMobile = useMobileResolution()

  if (!isBonus) return `${baseApr}%`

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "2px" }}>
      <Box
        sx={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            padding: bonusApr ? `0 ${rightGap}px 0 8px` : "0 8px",
            borderRadius: "12px",
            border: isMobile ? "none" : `1px solid ${COLORS.athensGrey}`,
            backgroundColor: isMobile ? COLORS.whiteSmoke : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant={isMobile ? "text4" : "text3"}>
            {baseApr}%
          </Typography>
        </Box>

        {bonusApr && (
          <Box
            sx={{
              position: "absolute",
              right: 0,
              padding: "1px 6px",
              borderRadius: "12px",
              backgroundColor: COLORS.glitter,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="text3" color={COLORS.ultramarineBlue}>
              {bonusApr}
            </Typography>
          </Box>
        )}
      </Box>

      {icons && (
        <Tooltip
          placement="bottom-end"
          arrow={false}
          title={adsComponent}
          componentsProps={{
            tooltip: {
              sx: {
                p: 0,
                bgcolor: "transparent",
                boxShadow: "none",
                borderRadius: 0,
                maxWidth: "none",
              },
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              "& .stacked-icon:not(:first-of-type)": {
                ml: "-4px",
              },
            }}
          >
            {icons.map((icon) => (
              <SvgIcon className="stacked-icon">{icon}</SvgIcon>
            ))}
          </Box>
        </Tooltip>
      )}
    </Box>
  )
}
