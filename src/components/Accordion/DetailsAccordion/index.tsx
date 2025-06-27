import {
  Box,
  SvgIcon,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material"

import UpArrow from "@/assets/icons/upArrow_icon.svg"
import { DetailsAccordionProps } from "@/components/Accordion/DetailsAccordion/interface"
import { SummaryContainer } from "@/components/Accordion/DetailsAccordion/style"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { useMobileResolution } from "@/hooks/useMobileResolution"

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
  summaryContent,
}: DetailsAccordionProps) => {
  const handleToggleOpen = () => {
    setIsOpen(!isOpen)
  }
  const theme = useTheme()
  const isMobile = useMobileResolution()
  return (
    <>
      <Box
        sx={{
          ...SummaryContainer(theme),
          ...summarySx,
        }}
        onClick={handleToggleOpen}
      >
        {summaryContent || (
          <>
            <Typography variant={isMobile ? "mobText3" : "text2"}>
              {summaryText}
            </Typography>
            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: arrowOnRight ? "flex-end" : "flex-start",
              }}
            >
              <SvgIcon
                sx={{
                  fontSize: isMobile ? "12px" : "16px",
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
                variant={isMobile ? "mobText3" : "text3"}
                text={chipValue}
                color={chipColor}
                textColor={chipValueColor}
              />
            )}
          </>
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
