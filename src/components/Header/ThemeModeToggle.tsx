"use client"

import { Box, Switch, Typography } from "@mui/material"

import { COLORS, TOKENS } from "@/theme/colors"
import { useThemeMode } from "@/theme/ThemeModeProvider"

type ThemeModeToggleProps = {
  variant?: "header" | "menu"
}

export const ThemeModeToggle = ({
  variant = "header",
}: ThemeModeToggleProps) => {
  const { mode, toggleMode } = useThemeMode()
  const isDark = mode === "dark"
  const isHeader = variant === "header"
  const label = isDark ? "Dark" : "Light"

  return (
    <Box
      component="label"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: isHeader ? "center" : "space-between",
        gap: "8px",
        minHeight: isHeader ? "36px" : "40px",
        padding: isHeader ? "0 12px" : "8px 10px",
        borderRadius: isHeader ? "10px" : "12px",
        cursor: "pointer",
        backgroundColor: isHeader ? TOKENS.heroButtonBg : TOKENS.surfaceSoft,
        color: isHeader ? COLORS.staticWhite : TOKENS.textPrimary,
        border: isHeader
          ? `1px solid ${TOKENS.heroButtonBorder}`
          : `1px solid ${TOKENS.borderSubtle}`,
        transition:
          "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease",
        "&:hover": {
          backgroundColor: isHeader
            ? TOKENS.heroButtonBgHover
            : TOKENS.actionGhostHoverBg,
        },
        "&:focus-within": {
          borderColor: isHeader ? COLORS.staticWhiteAlpha30 : TOKENS.brandPrimary,
        },
      }}
    >
      <Typography
        variant="text3"
        sx={{
          color: "inherit",
          fontWeight: 600,
          lineHeight: "20px",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>
      <Switch
        checked={isDark}
        onChange={toggleMode}
        inputProps={{
          "aria-label": `Switch to ${isDark ? "light" : "dark"} mode`,
        }}
        sx={{
          "& .MuiSwitch-switchBase": {
            "&.Mui-checked": {
              "& + .MuiSwitch-track": {
                opacity: 1,
                backgroundColor: isHeader
                  ? COLORS.staticWhiteAlpha30
                  : TOKENS.brandPrimary,
              },
              "& .MuiSwitch-thumb": {
                backgroundColor: COLORS.staticWhite,
              },
            },
          },
          "& .MuiSwitch-thumb": {
            backgroundColor: COLORS.staticWhite,
          },
          "& .MuiSwitch-track": {
            opacity: 1,
            backgroundColor: isHeader
              ? COLORS.staticWhiteAlpha30
              : TOKENS.borderDefault,
          },
        }}
      />
    </Box>
  )
}
