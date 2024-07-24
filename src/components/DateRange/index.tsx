import type { ChangeEvent } from "react"

import { Box, SvgIcon, TextField, Typography } from "@mui/material"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import dayjs from "dayjs"

import { COLORS } from "@/theme/colors"

import { DateRangeProps } from "./interface"
import {
  DateCalendarContainer,
  DateCalendarHeaderContainer,
  DateCalendarTextField,
  DateRangeContainer,
} from "./style"
import ArrowLeftIcon from "../../assets/icons/sharpArrow_icon.svg"

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

const formatDateForDateRange = (input: string) => {
  // delete all except digits
  const digits = input.replace(/\D/g, "")

  // fromat to DD/MM/YYYY
  let formattedValue = ""
  if (digits.length > 0) {
    formattedValue += digits.substring(0, 2) // day
    if (digits.length >= 2) {
      formattedValue += `/${digits.substring(2, 4)}` // month
    }
    if (digits.length >= 4) {
      formattedValue += `/${digits.substring(4, 8)}` // year
    }
  }

  return formattedValue
}

export const DateRange = ({ dates, setDates }: DateRangeProps) => {
  const { starting, ending } = dates

  const onChange = (
    evt: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    type: "starting" | "ending",
  ) => {
    const input = evt.target
    const cursorPosition = input.selectionStart
    const originalLength = input.value.length

    const formattedDate = formatDateForDateRange(input.value)

    setDates((prev) => {
      if (type === "starting")
        return {
          ...prev,
          starting: dayjs(formattedDate, "DD/MM/YYYY").isValid()
            ? dayjs(formattedDate, "DD/MM/YYYY")
            : formattedDate,
        }
      if (type === "ending")
        return {
          ...prev,
          ending: dayjs(formattedDate, "DD/MM/YYYY").isValid()
            ? dayjs(formattedDate, "DD/MM/YYYY")
            : formattedDate,
        }
      return prev
    })

    setTimeout(() => {
      const newLength = formattedDate.length

      if (cursorPosition !== null) {
        const newCursorPosition = cursorPosition + (newLength - originalLength)
        input.setSelectionRange(newCursorPosition, newCursorPosition)
      }
    }, 0)
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={DateRangeContainer}>
        <Box sx={DateCalendarContainer}>
          <Box sx={DateCalendarHeaderContainer}>
            <Typography
              sx={{ padding: "0px 4px" }}
              variant="text3"
              color={COLORS.santasGrey}
            >
              Start Date
            </Typography>
            <TextField
              sx={DateCalendarTextField}
              placeholder="01/02/1980"
              value={
                dayjs(starting, "DD/MM/YYYY").isValid()
                  ? dayjs(starting, "DD/MM/YYYY").format("DD/MM/YYYY")
                  : starting
              }
              onChange={(evt) => {
                onChange(evt, "starting")
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
              setDates((prev) => ({ ...prev, starting: newVal }))
            }}
            defaultValue={dayjs()}
          />
        </Box>
        <Box sx={DateCalendarContainer}>
          <Box sx={DateCalendarHeaderContainer}>
            <Typography
              sx={{ padding: "0px 4px" }}
              variant="text3"
              color={COLORS.santasGrey}
            >
              Due Date
            </Typography>
            <TextField
              sx={DateCalendarTextField}
              placeholder="01/02/1980"
              value={
                dayjs(ending, "DD/MM/YYYY").isValid()
                  ? dayjs(ending, "DD/MM/YYYY").format("DD/MM/YYYY")
                  : ending
              }
              onChange={(evt) => {
                onChange(evt, "ending")
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
              setDates((prev) => ({ ...prev, ending: newVal }))
            }}
            defaultValue={dayjs()}
          />
        </Box>
      </Box>
    </LocalizationProvider>
  )
}
