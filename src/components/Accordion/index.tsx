import { useState } from "react"

import { Box, SvgIcon, Typography } from "@mui/material"

import UpArrow from "@/assets/icons/upArrow_icon.svg"

import { AccordionProps } from "./interface"
import { AccordionContainer, ArrowContainer } from "./style"
import { TextfieldChip } from "../TextfieldAdornments/TextfieldChip"

export const Accordion = ({
  title,
  sx,
  arrowRight,
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
        <Typography variant="text2">{title}</Typography>
        <Box
          sx={{
            ...ArrowContainer,
            justifyContent: arrowRight ? "flex-end" : "flex-start",
          }}
        >
          <SvgIcon
            fontSize="medium"
            style={{
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s ease-in-out",
            }}
          >
            <UpArrow />
          </SvgIcon>
        </Box>
        <TextfieldChip text="6 ETH" />
      </Box>

      {isOpen && children}
    </>
  )
}
