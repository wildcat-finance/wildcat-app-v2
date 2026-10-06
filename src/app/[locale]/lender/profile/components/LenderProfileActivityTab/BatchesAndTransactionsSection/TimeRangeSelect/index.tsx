import { useRef } from "react"
import * as React from "react"

import {
  Box,
  ListSubheader,
  MenuItem,
  Select,
  SvgIcon,
  Typography,
} from "@mui/material"

import Filter from "@/assets/icons/filter_icon.svg"
import {
  MenuHeaderStyle,
  MenuPropsStyle,
  MenuTitleStyle,
  SelectStyle,
  StartAdornmentStyle,
} from "@/components/MarketsFilterSelect/style"
import { COLORS } from "@/theme/colors"
import { lh, pxToRem } from "@/theme/units"

export type TimeRangeId = "all" | "1d" | "7d" | "30d" | "90d"

// `seconds` is the look-back window applied to a row's timestamp; null = no
// filter (all time).
export const TIME_RANGE_OPTIONS: {
  id: TimeRangeId
  name: string
  seconds: number | null
}[] = [
  { id: "all", name: "All time", seconds: null },
  { id: "1d", name: "Last 24 hours", seconds: 86_400 },
  { id: "7d", name: "Last 7 days", seconds: 604_800 },
  { id: "30d", name: "Last 30 days", seconds: 2_592_000 },
  { id: "90d", name: "Last 90 days", seconds: 7_776_000 },
]

// Single-select dropdown styled like the MarketsFilterSelect pills.
export const TimeRangeSelect = ({
  value,
  onChange,
}: {
  value: TimeRangeId
  onChange: (value: TimeRangeId) => void
}) => {
  const selected =
    TIME_RANGE_OPTIONS.find((option) => option.id === value) ??
    TIME_RANGE_OPTIONS[0]

  const selectRef = useRef<HTMLElement>(null)

  const onOpen = () => {
    if (selectRef.current) {
      selectRef.current.classList.add("Mui-focused")
    }
  }

  const onClose = () => {
    if (selectRef.current) {
      selectRef.current.classList.remove("Mui-focused")
    }
  }

  return (
    <Select
      ref={selectRef}
      onOpen={onOpen}
      onClose={onClose}
      value={value}
      onChange={(event) => onChange(event.target.value as TimeRangeId)}
      size="small"
      MenuProps={{
        sx: { ...MenuPropsStyle, padding: "6px 4px" },
        anchorOrigin: { vertical: "bottom", horizontal: "left" },
        transformOrigin: { vertical: "top", horizontal: "left" },
      }}
      sx={SelectStyle}
      renderValue={() => (
        <Box sx={StartAdornmentStyle}>
          <SvgIcon
            fontSize="big"
            sx={{ "& path": { stroke: `${COLORS.santasGrey}` } }}
          >
            <Filter />
          </SvgIcon>
          <Typography variant="text3" sx={{ width: "max-content" }}>
            {selected.name}
          </Typography>
        </Box>
      )}
    >
      {/*
        ListSubheader (not a plain Box) so MUI Select treats it as a
        non-selectable header. MenuItems must be DIRECT children of Select —
        wrapping them in a Box stops Select from registering them as options.
      */}
      <ListSubheader disableSticky sx={MenuHeaderStyle}>
        <Box sx={MenuTitleStyle}>
          <SvgIcon
            fontSize="big"
            sx={{
              "& path": { stroke: `${COLORS.greySuit}` },
            }}
          >
            <Filter />
          </SvgIcon>

          <Typography variant="text3" color={COLORS.santasGrey}>
            Period
          </Typography>
        </Box>
      </ListSubheader>

      {TIME_RANGE_OPTIONS.map((option, index) => (
        <MenuItem
          key={option.id}
          value={option.id}
          sx={{
            fontFamily: "inherit",
            fontSize: pxToRem(13),
            lineHeight: lh(20, 13),
            fontWeight: 500,
            marginX: "4px",
            marginTop: index === 0 ? "4px" : 0,
            marginBottom: index === 4 ? "4px" : 0,
          }}
        >
          {option.name}
        </MenuItem>
      ))}
    </Select>
  )
}
