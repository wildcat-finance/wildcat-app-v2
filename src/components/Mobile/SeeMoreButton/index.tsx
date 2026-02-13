import { Dispatch, SetStateAction } from "react"

import { Button, SvgIcon } from "@mui/material"
import type { SxProps, Theme } from "@mui/material"

import DownArrow from "@/assets/icons/downArrow20_icon.svg"
import { COLORS } from "@/theme/colors"

type SeeMoreButtonProps = {
  variant: "accordion" | "modal"
  isOpen?: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
  disabled?: boolean
  sx?: SxProps<Theme>
}

export const SeeMoreButton = ({
  variant,
  isOpen,
  setIsOpen,
  disabled,
  sx,
}: SeeMoreButtonProps) => {
  const handleToggle = () => setIsOpen(!isOpen)

  if (variant === "accordion") {
    const label = isOpen ? "See Less" : "See More"

    return (
      <Button
        variant="text"
        size="small"
        fullWidth
        onClick={handleToggle}
        disabled={disabled}
        endIcon={
          <SvgIcon
            fontSize="small"
            sx={{
              "& path": { fill: COLORS.ultramarineBlue },
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease-in-out",
            }}
          >
            <DownArrow />
          </SvgIcon>
        }
        sx={{
          color: COLORS.ultramarineBlue,
          padding: 0,
          gap: "4px",
          "&:hover": {
            backgroundColor: "transparent",
            color: COLORS.ultramarineBlue,
          },
          ...sx,
        }}
      >
        {label}
      </Button>
    )
  }

  return (
    <Button
      variant="contained"
      color="secondary"
      size="medium"
      fullWidth
      onClick={handleToggle}
      disabled={disabled}
      sx={sx}
    >
      See More
    </Button>
  )
}
