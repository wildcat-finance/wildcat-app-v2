import { SyntheticEvent, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  IconButton,
  SvgIcon,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import dayjs, { Dayjs } from "dayjs"

import ArrowLeftIcon from "@/assets/icons/backArrow_icon.svg"
import { DateRange } from "@/components/DateRange"
import { COLORS } from "@/theme/colors"

import { StatementModalProps } from "./interface"
import { DialogContainer, HeaderTextContainer } from "./style"
import Cross from "../../../../../../../../assets/icons/cross_icon.svg"

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

export const StatementModal = ({ isOpen, setIsOpen }: StatementModalProps) => {
  const [value, setValue] = useState<"csv" | "pdf">("csv")
  const [starting, setStarting] = useState<Dayjs | null>(null)
  const [ending, setEnding] = useState<Dayjs | null>(null)
  const [datePickerValues, setDatePickerValues] = useState<{
    startDate: Dayjs
    endDate: Dayjs
  }>({
    startDate: dayjs(),
    endDate: dayjs(),
  })

  const handleClose = () => {
    setIsOpen(!isOpen)
  }

  const handleChange = (event: SyntheticEvent, newValue: "csv" | "pdf") => {
    setValue(newValue)
  }
  return (
    <Dialog open={isOpen} onClose={handleClose} sx={DialogContainer}>
      <Box>
        <Box sx={HeaderTextContainer}>
          <Typography variant="title3">Statement of Transactions</Typography>
          <IconButton
            disableRipple
            onClick={() => {
              setIsOpen(!isOpen)
            }}
          >
            <SvgIcon fontSize="big">
              <Cross />
            </SvgIcon>
          </IconButton>
        </Box>
        <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
          Generate and download a summary of all past transactions
        </Typography>
      </Box>
      <Tabs
        sx={{ width: "100%", height: "40px" }}
        variant="fullWidth"
        value={value}
        onChange={handleChange}
        className="contained"
      >
        <Tab value="csv" label="CSV" className="contained" />
        <Tab value="pdf" label="PDF" className="contained" />
      </Tabs>
      <Box sx={{ marginBottom: "32px" }}>
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
                  value={starting?.format("DD MMMM YYYY")}
                  fullWidth
                />
              </Box>

              <DateCalendar
                slots={{
                  leftArrowIcon: DateCalendarArrowLeft,
                  rightArrowIcon: DateCalendarArrowRight,
                }}
                value={starting}
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
                  value={ending?.format("DD MMMM YYYY")}
                  fullWidth
                />
              </Box>

              <DateCalendar
                slots={{
                  leftArrowIcon: DateCalendarArrowLeft,
                  rightArrowIcon: DateCalendarArrowRight,
                }}
                value={ending}
                onChange={(newVal) => {
                  setEnding(newVal)
                }}
                defaultValue={dayjs()}
              />
            </Box>
          </Box>
        </LocalizationProvider>
      </Box>
      <Button
        variant="contained"
        size="large"
        onClick={() => {
          setIsOpen(!isOpen)
        }}
        fullWidth
      >
        Download
      </Button>
    </Dialog>
  )
}
