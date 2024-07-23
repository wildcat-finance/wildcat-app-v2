import { useState } from "react"

import { Box, SvgIcon, Typography } from "@mui/material"

import UpArrow from "@/assets/icons/upArrow_icon.svg"
import { COLORS } from "@/theme/colors"

import { AccordionProps } from "./interface"
import { AccordionContainer, ArrowContainer } from "./style"
import { TextfieldChip } from "../TextfieldAdornments/TextfieldChip"

export const Accordion = ({
  title,
  sx,
  arrowRight,
  chipValue,
  iconContainerSx,
  summarySx,
  iconColor,
  children,
}: AccordionProps) => {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <Box
        sx={{
          ...AccordionContainer,
          ...sx,
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Typography variant="text4Highlighted" sx={{ ...summarySx }}>
          {title}
        </Typography>
        <Box
          sx={{
            ...ArrowContainer,
            justifyContent: arrowRight ? "flex-end" : "flex-start",
            ...iconContainerSx,
          }}
        >
          <SvgIcon
            sx={{
              "& path": {
                fill: `${iconColor}`,
              },
            }}
            fontSize="small"
            style={{
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s ease-in-out",
            }}
          >
            <UpArrow />
          </SvgIcon>
        </Box>
        {chipValue && <TextfieldChip text={chipValue} />}
      </Box>

      {isOpen && children}
    </>
  )
}
