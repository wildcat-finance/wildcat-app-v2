import { Button, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

export type MobileSwitcherButtonProps = {
  label: string
  amount?: number
  active: boolean
  onClick: () => void
}

export const MobileSwitcherButton = ({
  label,
  amount,
  active,
  onClick,
}: MobileSwitcherButtonProps) => (
  <Button
    variant="text"
    onClick={onClick}
    aria-pressed={active}
    sx={{
      borderRadius: "10px",
      gap: "6px",
      padding: "4px 16px",
      flexShrink: 0,
      fontSize: "12px",
      lineHeight: "20px",
      fontWeight: active ? 600 : 500,
      color: active ? COLORS.ultramarineBlue : COLORS.blackRock,
      backgroundColor: active ? "#E4EBFE80" : "transparent",
      "&:hover": {
        boxShadow: "none",
        backgroundColor: active ? "#E4EBFE80" : COLORS.hintOfRed,
        color: active ? COLORS.ultramarineBlue : COLORS.blackRock08,
      },
    }}
  >
    {label}
    {amount !== undefined && amount !== 0 && (
      <Typography
        variant="mobText3"
        color={active ? COLORS.blueRibbon : COLORS.santasGrey}
      >
        {amount}
      </Typography>
    )}
  </Button>
)
