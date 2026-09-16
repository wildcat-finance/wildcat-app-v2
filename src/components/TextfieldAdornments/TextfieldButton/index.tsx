import { Button } from "@mui/material"

import { COLORS } from "@/theme/colors"

export type TextfieldButtonProps = {
  buttonText: string
  onClick: () => void
  disabled?: boolean
}

export const TextfieldButton = ({
  buttonText,
  onClick,
  disabled,
}: TextfieldButtonProps) => (
  <Button
    variant="text"
    size="small"
    onClick={onClick}
    disabled={disabled}
    sx={{
      color: COLORS.ultramarineBlue,
      minWidth: "fit-content",
      width: "fit-content",
      lineHeight: "20px",
      padding: "0 12px",
      "&.Mui-disabled": {
        color: COLORS.santasGrey,
      },
    }}
  >
    {buttonText}
  </Button>
)
