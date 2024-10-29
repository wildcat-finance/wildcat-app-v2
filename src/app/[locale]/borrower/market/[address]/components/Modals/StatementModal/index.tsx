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
import { useTranslation } from "react-i18next"

import Cross from "@/assets/icons/cross_icon.svg"
import { DateRange } from "@/components/DateRange"
import { COLORS } from "@/theme/colors"

import { StatementModalProps } from "./interface"
import { DialogContainer, HeaderTextContainer } from "./style"

export const StatementModal = ({ isOpen, setIsOpen }: StatementModalProps) => {
  const { t } = useTranslation()
  const [value, setValue] = useState<"csv" | "pdf">("csv")
  const [dates, setDates] = useState<{
    starting: Dayjs | null
    ending: Dayjs | null
  }>({ starting: null, ending: null })

  const handleClose = () => {
    setIsOpen(!isOpen)
    setDates({ starting: null, ending: null })
  }

  const handleChange = (event: SyntheticEvent, newValue: "csv" | "pdf") => {
    setValue(newValue)
  }
  return (
    <Dialog open={isOpen} onClose={handleClose} sx={DialogContainer}>
      <Box marginBottom="32px">
        <Box sx={HeaderTextContainer}>
          <Typography variant="title3">
            {t("borrowerMarketDetails.modals.statement.title")}
          </Typography>
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
          {t("borrowerMarketDetails.modals.statement.generate")}
        </Typography>
      </Box>
      <Tabs
        sx={{ width: "100%", height: "40px", marginBottom: "20px" }}
        variant="fullWidth"
        value={value}
        onChange={handleChange}
        className="contained"
      >
        <Tab value="csv" label="CSV" className="contained" />
        <Tab value="pdf" label="PDF" className="contained" />
      </Tabs>
      <Box>
        <DateRange dates={dates} setDates={setDates} />
      </Box>
      <Button
        sx={{ marginTop: "12px" }}
        variant="contained"
        size="large"
        onClick={() => {
          setIsOpen(!isOpen)
        }}
        fullWidth
      >
        {t("borrowerMarketDetails.modals.statement.download")}
      </Button>
    </Dialog>
  )
}
