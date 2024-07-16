import { useState } from "react"

import { Box, SvgIcon, TextField, Typography } from "@mui/material"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import type { Meta } from "@storybook/react"
import dayjs, { Dayjs } from "dayjs"

import { COLORS } from "@/theme/colors"

import ArrowLeftIcon from "../assets/icons/backArrow_icon.svg"

export default {
  title: "Components/DateRange",
  component: DateCalendar,
} as Meta<typeof DateCalendar>

const DateCalendarArrowLeft = () => (
  <SvgIcon fontSize="small">
    <ArrowLeftIcon />
  </SvgIcon>
)

const DateCalendarArrowКRight = () => (
  <SvgIcon fontSize="small" style={{ rotate: "180deg" }}>
    <ArrowLeftIcon />
  </SvgIcon>
)

export const BasicDatePicker = () => {
  const [starting, setStarting] = useState<Dayjs | null>(dayjs())
  const [ending, setEnding] = useState<Dayjs | null>(dayjs())

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ display: "flex", gap: "28px" }}>
        <Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <Typography variant="text3" color={COLORS.santasGrey}>
              Start Date
            </Typography>
            <TextField value={starting?.format("DD MMMM YYYY")} fullWidth />
          </Box>
          <Box sx={{ padding: "0px 4px" }}>
            <DateCalendar
              slots={{
                leftArrowIcon: DateCalendarArrowLeft,
                rightArrowIcon: DateCalendarArrowКRight,
              }}
              value={starting}
              onChange={(newVal) => {
                setStarting(newVal)
              }}
              defaultValue={dayjs()}
            />
          </Box>
        </Box>
        <Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <Typography variant="text3" color={COLORS.santasGrey}>
              Due Date
            </Typography>
            <TextField value={ending?.format("DD MMMM YYYY")} fullWidth />
          </Box>
          <Box sx={{ padding: "0px 4px" }}>
            <DateCalendar
              slots={{
                leftArrowIcon: DateCalendarArrowLeft,
                rightArrowIcon: DateCalendarArrowКRight,
              }}
              value={ending}
              onChange={(newVal) => {
                setEnding(newVal)
              }}
              defaultValue={dayjs()}
            />
          </Box>
        </Box>
      </Box>
    </LocalizationProvider>
  )
}
