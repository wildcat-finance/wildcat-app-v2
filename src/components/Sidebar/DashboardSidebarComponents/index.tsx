import { ReactNode } from "react"

import { Box, SvgIcon, Typography } from "@mui/material"

import Arrow from "@/assets/icons/downArrow_icon.svg"
import { COLORS } from "@/theme/colors"

export const AccordionArrow = ({ open }: { open: boolean }) => (
  <SvgIcon
    fontSize="small"
    sx={{ rotate: open ? "180deg" : "", "& path": { fill: COLORS.santasGrey } }}
  >
    <Arrow />
  </SvgIcon>
)

export const DashboardButton = ({
  label,
  amount,
  onClick,
}: {
  label: string
  amount?: number
  onClick?: () => void
}) => (
  <Box
    onClick={onClick}
    sx={{
      width: "100%",
      display: "flex",
      gap: "5px",
      alignItems: "center",
      cursor: "pointer",
    }}
  >
    <Typography variant="text3">{label}</Typography>
    <Typography variant="text3" color={COLORS.santasGrey}>
      {amount !== 0 ? amount : null}
    </Typography>
  </Box>
)

export const DashboardSectionAccordion = ({
  open,
  label,
  amount,
  onClick,
  children,
  hideIndicator,
}: {
  open: boolean
  label: string
  amount?: number
  onClick?: () => void
  children?: ReactNode
  hideIndicator?: boolean
}) => (
  <Box>
    <Box
      onClick={onClick}
      sx={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
      }}
    >
      {!hideIndicator && (
        <Box
          sx={{
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            backgroundColor: open ? COLORS.ultramarineBlue : "transparent",
            marginRight: "10px",
          }}
        />
      )}
      <Typography variant="text3" sx={{ marginRight: "6px" }}>
        {label}
      </Typography>
      <Typography variant="text3" color={COLORS.santasGrey}>
        {amount !== 0 ? amount : null}
      </Typography>
    </Box>

    {open && (
      <Box
        sx={{
          width: "100%",
          paddingLeft: "40px",
          marginTop: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {children}
      </Box>
    )}
  </Box>
)

export const DashboardPageAccordion = ({
  open,
  label,
  amount,
  onClick,
  children,
  icon,
  hideAccordionButton,
}: {
  open: boolean
  label: string
  amount?: number
  onClick?: () => void
  children?: ReactNode
  icon?: ReactNode
  hideAccordionButton?: boolean
}) => (
  <Box
    sx={{
      width: "100%",
      marginBottom: open ? "16px" : "4px",
    }}
  >
    <Box
      onClick={onClick}
      sx={{
        width: "100%",
        padding: "6px 12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: open ? COLORS.whiteSmoke : "transparent",
        borderRadius: "8px",
        transition: "background-color 0.1s ease-in-out",
        cursor: "pointer",

        "&:hover": {
          backgroundColor: COLORS.whiteSmoke,
        },
      }}
    >
      <Box sx={{ display: "flex", width: "100%", alignItems: "center" }}>
        {icon}
        <Typography variant="text2" sx={{ marginRight: "6px" }}>
          {label}
        </Typography>
        <Typography variant="text2" color={COLORS.santasGrey}>
          {amount !== 0 ? amount : null}
        </Typography>
      </Box>

      {!hideAccordionButton && <AccordionArrow open={open} />}
    </Box>
    {open && (
      <Box
        sx={{
          width: "100%",
          paddingLeft: "14px",
          marginTop: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {children}
      </Box>
    )}
  </Box>
)
