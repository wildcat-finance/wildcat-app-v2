import { ChangeEvent, Dispatch, SetStateAction, useRef, useState } from "react"

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

import Filter from "@/assets/icons/filter_icon.svg"
import Icon from "@/assets/icons/search_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { COLORS } from "@/theme/colors"

export const FilterSelect = ({
  label,
  placeholder,
  selected,
  setSelected,
  options,
}: {
  label: string
  placeholder: string
  selected: { name: string; address: string }[]
  setSelected: Dispatch<SetStateAction<{ name: string; address: string }[]>>
  options: { name: string; address: string }[]
}) => {
  const { t } = useTranslation()
  const selectRef = useRef<HTMLElement>(null)

  const [search, setSearch] = useState("")

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
    item: { name: string; address: string },
  ) => {
    if (event.target.checked) {
      setSelected([...selected, item])
    } else {
      setSelected(
        selected.filter(
          (existingItem) => existingItem.address !== item.address,
        ),
      )
    }
  }

  const handleDeleteItem = (item: { name: string; address: string }) => {
    setSelected(
      selected.filter((existingItem) => existingItem.address !== item.address),
    )
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
      option.address.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        alignItems: "flex-start",
      }}
    >
      <Box
        sx={{ display: "flex", width: "100%", justifyContent: "space-between" }}
      >
        <Typography variant="text3" color={COLORS.santasGrey}>
          {label}
        </Typography>

        {selected.length !== 0 && (
          <Button
            onClick={handleClear}
            variant="text"
            size="small"
            sx={{
              color: COLORS.ultramarineBlue,
              padding: 0,
              minWidth: "min-content",
              "&:hover": {
                backgroundColor: "transparent",
                color: COLORS.cornflowerBlue,
              },
            }}
          >
            {t("filter.clear")}
          </Button>
        )}
      </Box>

      <FormControl sx={{ width: "100%" }}>
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
          renderValue={() => null}
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
          }}
          sx={{
            width: "100%",
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
                key={item.address}
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
                      (selectedItem) => selectedItem.address === item.address,
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
        </Select>
      </FormControl>

      {selected.length !== 0 && (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexWrap: "wrap",
            gap: "4px 4px",
          }}
        >
          {selected.map((item) => (
            <LendersMarketChip
              key={item.address}
              marketName={item.name}
              width={item.name.length > 27 ? "100%" : "fit-content"}
              withButton
              onClick={() => handleDeleteItem(item)}
              type="new"
            />
          ))}
        </Box>
      )}
    </Box>
  )
}
