import { Box, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

export type AirdropChipProps = {
  type: "active" | "non-active" | "expired" | "text"
  text?: string
  color?: string
  backgroundColor?: string
}

export const AirdropChip = ({
  type,
  text,
  color,
  backgroundColor,
}: AirdropChipProps) => {
  let chipConfig: {
    text: string
    color: string
    dotColor: string
    backgroundColor: string
  }

  switch (type) {
    case "active": {
      chipConfig = {
        text: "Active",
        color: COLORS.forestGreen,
        dotColor: COLORS.freshGrass,
        backgroundColor: COLORS.salad,
      }
      break
    }
    case "non-active": {
      chipConfig = {
        text: "Not Activated",
        color: COLORS.carminePink,
        dotColor: COLORS.carminePink,
        backgroundColor: COLORS.remy,
      }
      break
    }
    case "expired": {
      chipConfig = {
        text: "Expired",
        color: COLORS.concreetGrey,
        dotColor: COLORS.santasGrey,
        backgroundColor: COLORS.athensGrey,
      }
      break
    }
    default: {
      chipConfig = {
        text: `${text}`,
        color: `${color}`,
        dotColor: "",
        backgroundColor: `${backgroundColor}`,
      }
      break
    }
  }

  return (
    <Box
      sx={{
        width: "fit-content",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 12px",
        borderRadius: "12px",
        backgroundColor: chipConfig.backgroundColor,
      }}
    >
      {type !== "text" && (
        <Box
          sx={{
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            backgroundColor: chipConfig.dotColor,
          }}
        />
      )}

      <Typography variant="text4" color={chipConfig.color}>
        {chipConfig.text}
      </Typography>
    </Box>
  )
}
