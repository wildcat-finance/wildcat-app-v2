import { Box, IconButton, SvgIcon, Typography } from "@mui/material"

import Cross from "@/assets/icons/cross_icon.svg"
import Return from "@/assets/icons/return_icon.svg"
import { COLORS } from "@/theme/colors"

import { LendersMarketChipProps } from "./interface"

export const LendersMarketChip = ({
  type,
  marketName,
  withButton,
  onClick,
  width = "100%",
  disabled,
}: LendersMarketChipProps) => {
  let chipConfig

  switch (type) {
    case "old": {
      chipConfig = {
        backgroundColor: COLORS.whiteSmoke,
        color: COLORS.blackRock,
        endIcon: <Cross />,
        iconColor: COLORS.santasGrey,
      }
      break
    }
    case "new": {
      chipConfig = {
        backgroundColor: COLORS.glitter,
        color: COLORS.ultramarineBlue,
        endIcon: <Cross />,
        iconColor: COLORS.cornflowerBlue,
      }
      break
    }
    case "deleted": {
      chipConfig = {
        backgroundColor: COLORS.whiteSmoke,
        color: COLORS.greySuit,
        endIcon: <Return />,
        iconColor: COLORS.santasGrey,
      }
      break
    }
    default: {
      chipConfig = {
        backgroundColor: COLORS.whiteSmoke,
        color: COLORS.blackRock,
        endIcon: <Cross />,
        iconColor: COLORS.santasGrey,
      }
      break
    }
  }

  const onMouseDown = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation()
    if (onClick) {
      onClick()
    }
  }

  return (
    <Box
      sx={{
        boxSizing: "border-box",
        width,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 8px",
        borderRadius: "20px",
        backgroundColor: chipConfig.backgroundColor,
      }}
    >
      <Typography
        variant="text3"
        color={chipConfig.color}
        sx={{
          textDecoration: type === "deleted" ? "line-through" : "none",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {marketName}
      </Typography>

      {withButton && (
        <IconButton
          sx={{ marginLeft: "2px" }}
          onMouseDown={onMouseDown}
          disabled={disabled}
        >
          <SvgIcon
            style={{
              fontSize: "12px",
            }}
            sx={{
              padding: 0,
              "& path": {
                fill: chipConfig.iconColor,
              },
            }}
          >
            {chipConfig.endIcon}
          </SvgIcon>
        </IconButton>
      )}
    </Box>
  )
}
