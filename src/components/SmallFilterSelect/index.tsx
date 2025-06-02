import { ChangeEvent, Dispatch, SetStateAction, useRef, useState } from "react"
import * as React from "react"

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

import Filter from "@/assets/icons/filter_icon.svg"
import Icon from "@/assets/icons/search_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { COLORS } from "@/theme/colors"

export type SmallFilterSelectItem = { id: string; name: string }

export type SmallFilterSelectProps = {
  placeholder: string
  options: SmallFilterSelectItem[]
  selected: SmallFilterSelectItem[]
  setSelected: Dispatch<SetStateAction<SmallFilterSelectItem[]>>
  width?: string
  withSearch?: boolean
  showResultsbutton?: boolean
}

export const SmallFilterSelect = ({
  placeholder,
  options,
  selected,
  setSelected,
  width,
  withSearch = true,
  showResultsbutton = false,
}: SmallFilterSelectProps) => {
  const [search, setSearch] = useState("")

  const selectRef = useRef<HTMLElement>(null)

  const onOpen = () => {
    if (selectRef.current) {
      selectRef.current.classList.add("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.add("Mui-focused")
    }

    setSearch("")
  }

  const onClose = () => {
    if (selectRef.current) {
      selectRef.current.classList.remove("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.remove("Mui-focused")
    }
  }

  const handleChangeItems = (
    event: React.ChangeEvent<HTMLInputElement>,
    item: SmallFilterSelectItem,
  ) => {
    if (event.target.checked) {
      setSelected([...selected, item])
    } else {
      setSelected(
        selected.filter((existingItem) => existingItem.id !== item.id),
      )
    }
  }

  const handleDeleteItem = (item: SmallFilterSelectItem) => {
    setSelected(selected.filter((existingItem) => existingItem.id !== item.id))
  }

  const handleClear = () => {
    setSelected([])
  }

  const handleChangeName = (evt: ChangeEvent<HTMLInputElement>) => {
    setSearch(evt.target.value)
  }

  const filteredOptions = options.filter(
    (option) =>
      option.name.toLowerCase().includes(search.toLowerCase()) ||
      option.id.toLowerCase().includes(search.toLowerCase()),
  )

  if (options.length === 0) return null

  return (
    <FormControl>
      {selected.length === 0 && (
        <InputLabel
          sx={{
            fontSize: "13px",
            fontWeight: 500,
            lineHeight: "20px",
            color: COLORS.santasGrey,
            transform: "translate(33px, 6px)",
            pointerEvents: "none",

            "&.MuiInputLabel-shrink": {
              display: "block",

              "&.Mui-focused": {
                transform: "translate(33px, 6px)",
              },
            },
          }}
        >
          {placeholder}
        </InputLabel>
      )}

      <Select
        ref={selectRef}
        onOpen={onOpen}
        onClose={onClose}
        value={selected}
        size="small"
        multiple
        startAdornment={
          <SvgIcon
            fontSize="big"
            sx={{
              "& path": { stroke: `${COLORS.greySuit}` },
            }}
          >
            <Filter />
          </SvgIcon>
        }
        renderValue={(selectedMarkets) => (
          <Box
            sx={{
              height: "20px",
              display: "flex",
              flexWrap: "nowrap",
              overflow: "hidden",
              gap: 0.1,
              alignItems: "center",
            }}
          >
            {selectedMarkets.length > 0 && (
              <LendersMarketChip
                key={selectedMarkets[0].id}
                marketName={selectedMarkets[0].name}
                withButton
                width={
                  selectedMarkets[0].name.length > 15 ? "100%" : "fit-content"
                }
                onClick={() => handleDeleteItem(selectedMarkets[0])}
              />
            )}

            {selectedMarkets.length > 1 && (
              <Typography
                variant="text3"
                sx={{ whiteSpace: "nowrap", marginLeft: "4px" }}
              >
                ...
              </Typography>
            )}
          </Box>
        )}
        MenuProps={{
          sx: {
            "& .MuiPaper-root": {
              width: "234px",
              height: "fit-content",
              fontFamily: "inherit",
              padding: "12px",
              marginTop: "2px",
            },
          },
          anchorOrigin: {
            vertical: "bottom",
            horizontal: "left",
          },
          transformOrigin: {
            vertical: "top",
            horizontal: "left",
          },
        }}
        sx={{
          width: width || "180px",
          height: "32px",
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
      >
        {withSearch && (
          <TextField
            value={search}
            onChange={handleChangeName}
            fullWidth
            size="small"
            placeholder="Search"
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
        )}
        <Box
          sx={{
            maxHeight: "150px",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginTop: "20px",
            padding: "0px 10px",
          }}
        >
          {filteredOptions.map((item) => (
            <FormControlLabel
              key={item.id}
              label={item.name}
              sx={{
                "& .MuiTypography-root": {
                  maxWidth: "145px",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  overflowX: "hidden",
                },
              }}
              control={
                <ExtendedCheckbox
                  value={item}
                  onChange={(event) => handleChangeItems(event, item)}
                  checked={selected.some(
                    (selectedItem) => selectedItem.id === item.id,
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

        {showResultsbutton ? (
          <Box
            sx={{
              display: "flex",
              gap: "6px",
              marginTop: "12px",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Button
              onClick={handleClear}
              size="small"
              variant="contained"
              color="secondary"
              fullWidth
            >
              Reset
            </Button>
            <Button size="small" color="primary" variant="contained" fullWidth>
              Show Results
            </Button>
          </Box>
        ) : (
          <Button
            onClick={handleClear}
            size="medium"
            variant="contained"
            color="secondary"
            sx={{ width: "100%", marginTop: "12px" }}
          >
            Reset
          </Button>
        )}
      </Select>
    </FormControl>
  )
}
