import { useState } from "react"

import { Typography } from "@mui/material"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { DemoContainer } from "@mui/x-date-pickers/internals/demo"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import type { Meta } from "@storybook/react"
import { Dayjs } from "dayjs"

import { COLORS } from "@/theme/colors"

import CalendarIcon from "../assets/icons/calendar_icon.svg"

export default {
  title: "Components/DateRange",
  component: DatePicker,
} as Meta<typeof DatePicker>
export const BasicDatePicker = () => {
  const [starting, setStarting] = useState<Dayjs | null>(null)
  const [ending, setEnding] = useState<Dayjs | null>(null)

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DemoContainer components={["DatePicker"]}>
        <DatePicker
          value={starting}
          onChange={(newValue) => {
            setStarting(newValue)
          }}
          views={["month", "year"]}
          sx={{
            "& .css-1bl45wc-MuiInputBase-root-MuiFilledInput-root": {
              height: "50px",
              backgroundColor: "white",
              border: "1px solid",
              borderColor: COLORS.hintOfRed,
              borderRadius: "12px",
              textDecoration: "none",
              "&::before": {
                border: "none",
              },
              "&::after": {
                border: "none",
              },
            },
          }}
          slotProps={{
            layout: { sx: { borderRadius: "12px" } },
          }}
          slots={{
            openPickerIcon: CalendarIcon,
          }}
          label="Starting on"
        />
        <DatePicker
          value={ending}
          onChange={(newValue) => {
            setEnding(newValue)
          }}
          views={["month", "year"]}
          sx={{
            "& .css-1bl45wc-MuiInputBase-root-MuiFilledInput-root": {
              height: "50px",
              backgroundColor: "white",
              border: "1px solid",
              borderColor: COLORS.hintOfRed,
              borderRadius: "12px",
              textDecoration: "none",
              "&::before": {
                border: "none",
              },
              "&::after": {
                border: "none",
              },
            },
          }}
          slotProps={{
            layout: { sx: { borderRadius: "12px" } },
          }}
          slots={{
            openPickerIcon: CalendarIcon,
          }}
          label="Ending on"
        />
      </DemoContainer>
      <Typography>
        Starting date: {starting?.format("MMMM-YYYY")} - Ending date:{" "}
        {ending?.format("MMMM-YYYY")}
      </Typography>
    </LocalizationProvider>
  )
}
