import { Box, SvgIcon, TextField, Typography } from "@mui/material"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import dayjs from "dayjs"

import { COLORS } from "@/theme/colors"

import { DateRangeProps } from "./interface"
import ArrowLeftIcon from "../../assets/icons/backArrow_icon.svg"

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
                const formatDate = formatDateForDateRange(evt.target.value)
                if (dayjs(formatDate, "DD/MM/YYYY").isValid()) {
                  setDates((prev) => ({
                    ...prev,
                    starting: dayjs(formatDate, "DD/MM/YYYY"),
                  }))
                } else setDates((prev) => ({ ...prev, starting: formatDate }))
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
                const formatDate = formatDateForDateRange(evt.target.value)
                if (dayjs(formatDate, "DD/MM/YYYY").isValid()) {
                  setDates((prev) => ({
                    ...prev,
                    ending: dayjs(formatDate, "DD/MM/YYYY"),
                  }))
                } else setDates((prev) => ({ ...prev, ending: formatDate }))
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
              setDates((prev) => ({ ...prev, starting: newVal }))
            }}
            defaultValue={dayjs()}
          />
        </Box>
      </Box>
    </LocalizationProvider>
  )
}
