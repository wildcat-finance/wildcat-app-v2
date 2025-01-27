import { Box } from "@mui/material"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import dayjs from "dayjs"

import { DateTextFieldProps } from "./interface"
import {
  DateCalendarContainer,
  DateCalendarHeaderContainer,
  DateRangeContainer,
} from "./style"

export const DateTextField = ({
  value,
  onValueChange,
  min,
  max,
}: DateTextFieldProps) => {
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
