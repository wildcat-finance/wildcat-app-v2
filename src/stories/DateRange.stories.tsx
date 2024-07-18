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
  <SvgIcon
    sx={{
      "& path": { fill: `${COLORS.greySuit}` },
    }}
    fontSize="small"
  >
    <ArrowLeftIcon />
  </SvgIcon>
)

const DateCalendarArrowRight = () => (
  <SvgIcon
    sx={{
      "& path": { fill: `${COLORS.greySuit}` },
    }}
    fontSize="small"
    style={{ rotate: "180deg" }}
  >
    <ArrowLeftIcon />
  </SvgIcon>
)

export const BasicDatePicker = () => {
  const [starting, setStarting] = useState<Dayjs | string | null>(null)
  const [ending, setEnding] = useState<Dayjs | string | null>(null)

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ display: "flex", gap: "28px" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <Typography
              sx={{ padding: "0px 4px" }}
              variant="text3"
              color={COLORS.santasGrey}
            >
              Start Date
            </Typography>
            <TextField
              sx={{
                height: "44px",
                "& .MuiInputBase-root": {
                  width: "274px",
                  height: "44px",
                },
              }}
              placeholder="12/01/1980"
              value={
                dayjs(starting, "DD/MM/YYYY").isValid()
                  ? dayjs(starting, "DD/MM/YYYY").format("DD/MM/YYYY")
                  : starting
              }
              onChange={(evt) => {
                if (dayjs(evt.target.value, "DD/MM/YYYY").isValid()) {
                  setStarting(dayjs(evt.target.value, "DD/MM/YYYY"))
                } else setStarting(evt.target.value)
              }}
              fullWidth
            />
          </Box>

          <DateCalendar
            slots={{
              leftArrowIcon: DateCalendarArrowLeft,
              rightArrowIcon: DateCalendarArrowRight,
            }}
            value={
              dayjs(starting, "DD/MM/YYYY").isValid()
                ? dayjs(starting, "DD/MM/YYYY")
                : null
            }
            onChange={(newVal) => {
              setStarting(newVal)
            }}
            defaultValue={dayjs()}
          />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <Typography
              sx={{ padding: "0px 4px" }}
              variant="text3"
              color={COLORS.santasGrey}
            >
              Due Date
            </Typography>
            <TextField
              sx={{
                height: "44px",
                "& .MuiInputBase-root": {
                  width: "274px",
                  height: "44px",
                },
              }}
              placeholder="12/01/1980"
              value={
                dayjs(ending, "DD/MM/YYYY").isValid()
                  ? dayjs(ending, "DD/MM/YYYY").format("DD/MM/YYYY")
                  : ending
              }
              onChange={(evt) => {
                if (dayjs(evt.target.value, "DD/MM/YYYY").isValid()) {
                  setEnding(dayjs(evt.target.value, "DD/MM/YYYY"))
                } else setEnding(evt.target.value)
              }}
              fullWidth
            />
          </Box>

          <DateCalendar
            slots={{
              leftArrowIcon: DateCalendarArrowLeft,
              rightArrowIcon: DateCalendarArrowRight,
            }}
            value={
              dayjs(ending, "DD/MM/YYYY").isValid()
                ? dayjs(ending, "DD/MM/YYYY")
                : null
            }
            onChange={(newVal) => {
              setEnding(newVal)
            }}
            defaultValue={dayjs()}
          />
        </Box>
      </Box>
    </LocalizationProvider>
  )
}
