import { Button } from "@mui/material"

import { COLORS } from "@/theme/colors"

export type TextfieldButtonProps = {
  buttonText: string
  onClick: () => void
}

export const TextfieldButton = ({
  buttonText,
  onClick,
}: TextfieldButtonProps) => (
  <Button
    variant="text"
    size="small"
    onClick={onClick}
    sx={{
      color: COLORS.ultramarineBlue,
      minWidth: "fit-content",
      width: "fit-content",
      lineHeight: "20px",
      padding: "0 12px",
    }}
  >
    {buttonText}
  </Button>
)
