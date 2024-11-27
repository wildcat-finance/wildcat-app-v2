import { Box, SvgIcon, Typography } from "@mui/material"

import UpArrow from "@/assets/icons/upArrow_icon.svg"
import { DetailsAccordionProps } from "@/components/Accordion/DetailsAccordion/interface"
import { SummaryContainer } from "@/components/Accordion/DetailsAccordion/style"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"

export const DetailsAccordion = ({
  isOpen,
  setIsOpen,
  summaryText,
  arrowOnRight,
  iconColor,
  summarySx,
  chipColor,
  chipValueColor,
  chipValue,
  bodySx,
  children,
}: DetailsAccordionProps) => {
  const handleToggleOpen = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      <Box
        sx={{
          ...SummaryContainer,
          ...summarySx,
        }}
        onClick={handleToggleOpen}
      >
        <Typography variant="text2">{summaryText}</Typography>
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: arrowOnRight ? "flex-end" : "flex-start",
          }}
        >
          <SvgIcon
            fontSize="medium"
            sx={{
              "& path": {
                fill: `${iconColor}`,
              },
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <UpArrow />
          </SvgIcon>
        </Box>
        {chipValue && (
          <TextfieldChip
            text={chipValue}
            color={chipColor}
            textColor={chipValueColor}
          />
        )}
      </Box>
      <Box
        sx={{
          ...bodySx,
          maxHeight: isOpen ? "2000px" : "0px",
          overflow: isOpen ? "visible" : "hidden",
        }}
      >
        {children}
      </Box>
    </>
  )
}
