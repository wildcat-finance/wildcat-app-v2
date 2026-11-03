import { ReactNode } from "react"

import { Box, ButtonBase, SvgIcon, Typography } from "@mui/material"

import Arrow from "@/assets/icons/downArrow_icon.svg"
import { COLORS } from "@/theme/colors"

export const AccordionArrow = ({
  open,
  size,
}: {
  open: boolean
  size?: string
}) => (
  <SvgIcon
    fontSize="small"
    sx={{
      ...(size && { fontSize: size }),
      rotate: open ? "180deg" : "",
      "& path": { fill: COLORS.santasGrey },
    }}
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

export type DashboardSubItem<T extends string> = {
  value: T
  label: string
  amount?: number
}

export const DashboardSubItems = <T extends string>({
  items,
  activeValue,
  onSelect,
}: {
  items: DashboardSubItem<T>[]
  activeValue: T | null
  onSelect: (value: T) => void
}) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    {items.map(({ value, label, amount }) => {
      const active = value === activeValue

      return (
        <ButtonBase
          key={value}
          disableRipple
          onClick={() => onSelect(value)}
          aria-current={active ? "true" : undefined}
          sx={{
            width: "fit-content",
            padding: "2px 0",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: "inherit",
          }}
        >
          <Box
            sx={{
              width: "8px",
              height: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                backgroundColor: active
                  ? COLORS.ultramarineBlue
                  : "transparent",
              }}
            />
          </Box>
          <Typography variant={active ? "text3Highlighted" : "text3"}>
            {label}
          </Typography>
          <Typography variant="text3" color={COLORS.santasGrey}>
            {amount}
          </Typography>
        </ButtonBase>
      )
    })}
  </Box>
)

export const DashboardSectionAccordion = ({
  open,
  label,
  amount,
  onClick,
  children,
  hideIndicator,
  compact,
}: {
  open: boolean
  label: string
  amount?: number
  onClick?: () => void
  children?: ReactNode
  hideIndicator?: boolean
  compact?: boolean
}) => (
  <Box>
    <Box
      onClick={onClick}
      sx={{
        width: "100%",
        padding: compact ? "4px 0" : undefined,
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
      <Typography variant="text3" sx={{ marginRight: compact ? "4px" : "6px" }}>
        {label}
      </Typography>
      <Typography variant="text3" color={COLORS.santasGrey}>
        {amount}
      </Typography>
    </Box>

    {open && (
      <Box
        sx={{
          width: "100%",
          paddingLeft: compact ? 0 : "40px",
          marginTop: compact ? "6px" : "12px",
          display: "flex",
          flexDirection: "column",
          gap: compact ? "6px" : "10px",
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
  compact,
}: {
  open: boolean
  label: string
  amount?: number
  onClick?: () => void
  children?: ReactNode
  icon?: ReactNode
  hideAccordionButton?: boolean
  compact?: boolean
}) => {
  const openMarginBottom = compact ? "12px" : "16px"

  return (
    <Box
      sx={{
        width: "100%",
        marginBottom: open ? openMarginBottom : "4px",
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
            {amount}
          </Typography>
        </Box>

        {!hideAccordionButton && (
          <AccordionArrow open={open} size={compact ? "12px" : undefined} />
        )}
      </Box>
      {open && (
        <Box
          sx={{
            width: "100%",
            paddingLeft: compact ? "26px" : "14px",
            marginTop: compact ? "8px" : "12px",
            display: "flex",
            flexDirection: "column",
            gap: compact ? "6px" : "14px",
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  )
}
