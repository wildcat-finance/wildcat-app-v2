import { useState } from "react"

import { Box, SvgIcon, Typography } from "@mui/material"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import type { Meta } from "@storybook/react"
import dayjs, { Dayjs } from "dayjs"

import { COLORS } from "@/theme/colors"

import CalendarIcon from "../assets/icons/calendar_icon.svg"

export default {
  title: "Components/DateRange",
  component: DatePicker,
} as Meta<typeof DatePicker>

const DatePickerOpenIcon = () => (
  <SvgIcon fontSize="medium">
    <CalendarIcon />
  </SvgIcon>
)

export const BasicDatePicker = () => {
  const [starting, setStarting] = useState<Dayjs | null>(dayjs())
  const [ending, setEnding] = useState<Dayjs | null>(dayjs())
  const DatePickerStyle = {
    "& .css-1bl45wc-MuiInputBase-root-MuiFilledInput-root": {
      height: "50px",
      backgroundColor: "white",
      border: "1px solid",
      borderColor: COLORS.hintOfRed,
      borderRadius: "12px",
      textDecoration: "none",
      "&:hover": {
        "&:not(.Mui-disabled, .Mui-error)": {
          "&::before": {
            border: "0px",
          },
        },
        backgroundColor: "white",
      },
      "&::before": {
        border: "none",
      },
      "&::after": {
        border: "none",
      },
    },
  }

  const TypographyStyle = {
    position: "absolute",
    color: COLORS.santasGrey,
    top: "6px",
    left: "12px",
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ display: "flex", gap: "22px" }}>
        <Box sx={{ position: "relative" }}>
          <DatePicker
            value={starting}
            onChange={(newValue) => {
              setStarting(newValue)
            }}
            views={["month", "year"]}
            sx={DatePickerStyle}
            slotProps={{
              layout: { sx: { borderRadius: "12px" } },
            }}
            slots={{
              openPickerIcon: DatePickerOpenIcon,
            }}
            label="Starting on"
          />
          <Typography sx={TypographyStyle} variant="text3">
            Starting on
          </Typography>
        </Box>
        <Box sx={{ position: "relative" }}>
          <DatePicker
            value={ending}
            onChange={(newValue) => {
              setEnding(newValue)
            }}
            views={["month", "year"]}
            sx={DatePickerStyle}
            slotProps={{
              layout: { sx: { borderRadius: "12px" } },
            }}
            slots={{
              openPickerIcon: DatePickerOpenIcon,
            }}
            label="Ending on"
          />
          <Typography sx={TypographyStyle} variant="text3">
            Ending on
          </Typography>
        </Box>
      </Box>
      <Typography>
        Starting date: {starting?.format("MMMM-YYYY")} - Ending date:{" "}
        {ending?.format("MMMM-YYYY")}
      </Typography>
    </LocalizationProvider>
  )
}
