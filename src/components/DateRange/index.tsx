import { Box, SvgIcon, Typography } from "@mui/material"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"

import { DateRangeProps } from "./interface"
import {
  DatePickerContainer,
  DatePickersContainer,
  DatePickerStyle,
  TypographyStyle,
} from "./style"
import CalendarIcon from "../../assets/icons/calendar_icon.svg"

const DatePickerOpenIcon = () => (
  <SvgIcon fontSize="medium">
    <CalendarIcon />
  </SvgIcon>
)

export const DateRange = ({ dates, setDates }: DateRangeProps) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <Box sx={DatePickersContainer}>
      <Box sx={DatePickerContainer}>
        <DatePicker
          value={dates.startDate}
          onChange={(newValue) => {
            setDates((prevValue) => ({ ...prevValue, startDate: newValue! }))
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
      <Box sx={DatePickerContainer}>
        <DatePicker
          value={dates.endDate}
          onChange={(newValue) => {
            setDates((prevValue) => ({ ...prevValue, endDate: newValue! }))
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
  </LocalizationProvider>
)
