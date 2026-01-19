import { ChangeEvent } from "react"

import { Box } from "@mui/material"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"

import { dayjs } from "@/utils/dayjs"

import { DateTextFieldProps } from "./interface"
import {
  DateCalendarContainer,
  DateCalendarHeaderContainer,
  DateRangeContainer,
} from "./style"

// Utility function to format date string to 'DD/MM/YYYY'
const formatDate = (input: string | undefined) => {
  // delete all except digits
  if (input) {
    const digits = input.replace(/\D/g, "")

    // format to DD/MM/YYYY
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
  return undefined
}

export const DateTextField = ({
  value,
  onValueChange,
  min,
  max,
}: DateTextFieldProps) => {
  const onInputChange = (
    evt: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const input = evt.target
    const cursorPosition = input.selectionStart
    const originalLength = input.value.length

    const formattedDate = formatDate(input.value)

    const date = dayjs(formattedDate, "DD/MM/YYYY")
    if (max && date.isAfter(max)) {
      onValueChange(max)
    } else if (min && date.isBefore(min)) {
      onValueChange(min)
    } else {
      onValueChange(date)
    }

    setTimeout(() => {
      if (formattedDate) {
        const newLength = formattedDate.length

        if (cursorPosition !== null) {
          const newCursorPosition =
            cursorPosition + (newLength - originalLength)
          input.setSelectionRange(newCursorPosition, newCursorPosition)
        }
      }
    }, 0)
  }

  const onCalendarChange = (newDate: dayjs.Dayjs | null) => {
    if (newDate) {
      onValueChange(newDate)
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={DateRangeContainer}>
        <Box sx={DateCalendarContainer}>
          <Box sx={DateCalendarHeaderContainer}>
            <DatePicker
              value={value}
              onChange={onCalendarChange}
              maxDate={max}
              minDate={min}
              slotProps={{
                textField: {
                  variant: "filled",
                  size: "regular",
                  sx: {
                    "& .MuiInputBase-root": {
                      backgroundColor: "inherit",
                    },
                  },
                },
              }}
            />
          </Box>
        </Box>
      </Box>
    </LocalizationProvider>
  )
}
