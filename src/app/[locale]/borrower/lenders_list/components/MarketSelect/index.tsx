import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  Select,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import Cross from "@/assets/icons/cross_icon.svg"
import Filter from "@/assets/icons/filter_icon.svg"
import Icon from "@/assets/icons/search_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { COLORS } from "@/theme/colors"

import { MarketSelectProps } from "./interface"

export const MarketSelect = ({
  chosenMarkets,
  borrowerMarkets,
  type,
  setChosenMarkets,
}: MarketSelectProps) => {
  const { t } = useTranslation()

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setChosenMarkets((prevItems) => [
        ...prevItems,
        { marketName: event.target.value, address: "", marketStatus: "added" },
      ])
    } else {
      setChosenMarkets((prevItems) =>
        prevItems.filter(
          (selectedItem) => selectedItem.marketName !== event.target.value,
        ),
      )
    }
  }

  const handleDeleteMarket = (marketToDelete: string) => {
    setChosenMarkets((prevMarkets) =>
      prevMarkets.filter((market) => market.marketName !== marketToDelete),
    )
  }

  const handleReset = () => {
    setChosenMarkets([])
  }

  const inputHeight = (() => {
    if (type === "add" || type === "table") return "auto"
    if (type === "filter") return "32px"
    return ""
  })()

  const inputWidth = (() => {
    if (type === "table" || type === "add") return "100%"
    if (type === "filter") return "220px"
    return ""
  })()

  const inputMinHeight = (() => {
    if (type === "filter" || type === "table") return "32px"
    if (type === "add") return "44px"
    return ""
  })()

  return (
    <FormControl
      sx={{
        width: inputWidth,
      }}
    >
      <InputLabel
        sx={{
          fontSize: type === "add" ? 14 : 13,
          fontWeight: 500,
          lineHeight: "20px",
          color: COLORS.santasGrey,
          transform: `translate(${
            type === "table" || type === "add" ? "17px" : "33px"
          }, ${type === "add" ? "12px" : "6px"}) scale(1)`,
          pointerEvents: "none",

          "&.MuiInputLabel-shrink": {
            display: "block",

            "&.Mui-focused": {
              display: "none",
            },
          },

          "&.MuiFormLabel-filled": {
            display: "none",
          },
        }}
      >
        {type === "filter" ? "Filter by Markets" : "Add market"}
      </InputLabel>
      <Select
        value={chosenMarkets}
        renderValue={(selected) => (
          <Box
            sx={{
              height: type === "filter" ? "20px" : "auto",
              display: "flex",
              flexWrap: "wrap",
              overflow: "hidden",
              gap: 0.5,
            }}
          >
            {selected.map((value) => (
              <LendersMarketChip
                key={value.marketName}
                marketName={value.marketName}
                withButton
                width={value.marketName.length > 14 ? "100%" : "fit-content"}
                onClick={() => handleDeleteMarket(value.marketName)}
                type={value.marketStatus}
              />
            ))}
          </Box>
        )}
        size="small"
        startAdornment={
          type === "filter" ? (
            <SvgIcon
              fontSize="big"
              sx={{
                "& path": { stroke: `${COLORS.greySuit}` },
              }}
            >
              <Filter />
            </SvgIcon>
          ) : null
        }
        endAdornment={
          type === "table" || type === "add" ? (
            <Box onClick={handleReset}>
              <SvgIcon
                fontSize="small"
                sx={{
                  marginTop: type === "add" ? "14px" : "9px",
                  marginRight: "12px",
                  "& path": { fill: `${COLORS.santasGrey}` },
                }}
              >
                <Cross />
              </SvgIcon>
            </Box>
          ) : null
        }
        sx={{
          height: inputHeight,
          width: inputWidth,
          minHeight: inputMinHeight,
          minWidth: "220px",
          maxWidth: "392px",
          alignItems:
            type === "table" || type === "add" ? "baseline" : "center",
          "& .MuiSelect-icon": {
            display: "block",
            top: "5px",
            transform: `translate(3.5px, ${
              type === "add" ? "5px" : "0px"
            }) scale(0.7)`,
            "&.MuiSelect-iconOpen": {
              transform: `translate(3.5px, ${
                type === "add" ? "5px" : "0px"
              }) scale(0.7) rotate(180deg)`,
            },
            "& path": { fill: `${COLORS.santasGrey}` },
          },
          borderRadius: "12px",
        }}
        MenuProps={{
          sx: {
            "& .MuiPaper-root": {
              width: "312px",
              fontFamily: "inherit",
              padding: "16px 20px 20px",
              marginTop: "2px",
              marginLeft: "45px",
            },
          },
        }}
        multiple
      >
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            marginBottom: "16px",
          }}
        >
          <Typography variant="text2">Filter by Markets</Typography>

          <TextField
            fullWidth
            size="small"
            placeholder="Search by Name"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SvgIcon
                    fontSize="small"
                    sx={{
                      width: "20px",
                      "& path": { fill: `${COLORS.greySuit}` },
                    }}
                  >
                    <Icon />
                  </SvgIcon>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box
          sx={{
            height: "132px",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            padding: "0 10px",
          }}
        >
          {borrowerMarkets.map((market) => (
            <FormControlLabel
              label={market}
              control={
                <ExtendedCheckbox
                  value={market}
                  onChange={handleChange}
                  checked={chosenMarkets.some(
                    (chosenMarket) => chosenMarket.marketName === market,
                  )}
                  sx={{
                    "& ::before": {
                      transform: "translate(-3px, -3px) scale(0.75)",
                    },
                  }}
                />
              }
            />
          ))}
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: "6px",
            marginTop: "24px",
          }}
        >
          <Button
            onClick={handleReset}
            size="medium"
            variant="contained"
            color="secondary"
            sx={{ width: "100%" }}
          >
            Reset
          </Button>

          <Button size="medium" variant="contained" sx={{ width: "100%" }}>
            Show Results
          </Button>
        </Box>
      </Select>
    </FormControl>
  )
}
