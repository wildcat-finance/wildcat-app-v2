import { SyntheticEvent, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  IconButton,
  SvgIcon,
  Tab,
  Tabs,
  Typography,
} from "@mui/material"
import { Dayjs } from "dayjs"

import Cross from "@/assets/icons/cross_icon.svg"
import { DateRange } from "@/components/DateRange"
import { COLORS } from "@/theme/colors"

import { StatementModalProps } from "./interface"
import { DialogContainer, HeaderTextContainer } from "./style"

export const StatementModal = ({ isOpen, setIsOpen }: StatementModalProps) => {
  const [value, setValue] = useState<"csv" | "pdf">("csv")
  const [dates, setDates] = useState<{
    starting: Dayjs | string | null
    ending: Dayjs | string | null
  }>({ starting: null, ending: null })

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
        <DateRange dates={dates} setDates={setDates} />
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
