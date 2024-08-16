import { Dispatch, SetStateAction } from "react"

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

export type MarketSelectProps = {
  chosenMarkets: string[]
  borrowerMarkets: string[]
  type: "filter" | "add"
  setChosenMarkets: Dispatch<SetStateAction<string[]>>
}

export const MarketSelect = ({
  chosenMarkets,
  borrowerMarkets,
  type,
  setChosenMarkets,
}: MarketSelectProps) => {
  const { t } = useTranslation()

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setChosenMarkets((prevItems) => [...prevItems, event.target.value])
    } else {
      setChosenMarkets((prevItems) =>
        prevItems.filter((selectedItem) => selectedItem !== event.target.value),
      )
    }
  }

  const handleDeleteMarket = (marketToDelete: string) => {
    setChosenMarkets((prevMarkets) =>
      prevMarkets.filter((market) => market !== marketToDelete),
    )
  }

  const handleReset = () => {
    setChosenMarkets([])
  }

  return (
    <FormControl>
      <InputLabel
        sx={{
          fontSize: 13,
          fontWeight: 500,
          lineHeight: "20px",
          color: COLORS.santasGrey,
          transform: "translate(33px, 6px) scale(1)",

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
                key={value}
                marketName={value}
                withButton
                width={value.length > 14 ? "100%" : "fit-content"}
                onClick={() => handleDeleteMarket(value)}
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
          type === "add" ? (
            <SvgIcon
              fontSize="small"
              sx={{
                "& path": { fill: `${COLORS.santasGrey}` },
              }}
            >
              <Cross />
            </SvgIcon>
          ) : null
        }
        sx={{
          width: "220px",

          "& .MuiSelect-icon": {
            display: "block",
            top: "5px",
            transform: "translate(3.5px, 0px) scale(0.7)",
            "&.MuiSelect-iconOpen": {
              transform: "translate(3.5px, 0px) scale(0.7) rotate(180deg)",
            },

            "& path": { fill: `${COLORS.santasGrey}` },
          },
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
                    (chosenMarket) => chosenMarket === market,
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
