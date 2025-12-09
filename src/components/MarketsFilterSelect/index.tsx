import { useRef } from "react"
import * as React from "react"

import {
  Box,
  Button,
  FormControlLabel,
  Select,
  SvgIcon,
  Typography,
} from "@mui/material"

import Cross from "@/assets/icons/cross_icon.svg"
import Filter from "@/assets/icons/filter_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import {
  MenuBodyStyle,
  MenuHeaderStyle,
  MenuPropsStyle,
  MenuTitleStyle,
  SelectStyle,
  StartAdornmentStyle,
} from "@/components/MarketsFilterSelect/style"
import { COLORS } from "@/theme/colors"

import { MarketsFilterSelectItem, MarketsFilterSelectProps } from "./interface"

export const MarketsFilterSelect = ({
  placeholder,
  options,
  selected,
  setSelected,
}: MarketsFilterSelectProps) => {
  const selectRef = useRef<HTMLElement>(null)

  const onOpen = () => {
    if (selectRef.current) {
      selectRef.current.classList.add("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.add("Mui-focused")
    }
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
    item: MarketsFilterSelectItem,
  ) => {
    if (event.target.checked) {
      setSelected([...selected, item])
    } else {
      setSelected(
        selected.filter((existingItem) => existingItem.id !== item.id),
      )
    }
  }

  const handleClear = () => {
    setSelected([])
  }

  return (
    <Select
      placeholder="pupka"
      ref={selectRef}
      onOpen={onOpen}
      onClose={onClose}
      value={selected}
      size="small"
      multiple
      startAdornment={
        <Box sx={StartAdornmentStyle}>
          <SvgIcon
            fontSize="big"
            sx={{
              "& path": { stroke: `${COLORS.santasGrey}` },
            }}
          >
            <Filter />
          </SvgIcon>

          <Typography variant="text3">{placeholder}</Typography>
        </Box>
      }
      renderValue={(selectedOptions) => (
        <LendersMarketChip
          type="new"
          marketName={selectedOptions.length.toString()}
          withButton
          onClick={() => handleClear()}
        />
      )}
      MenuProps={{
        sx: MenuPropsStyle,
        anchorOrigin: {
          vertical: "bottom",
          horizontal: "left",
        },
        transformOrigin: {
          vertical: "top",
          horizontal: "left",
        },
      }}
      sx={SelectStyle}
    >
      <Box sx={MenuHeaderStyle}>
        <Box sx={MenuTitleStyle}>
          <SvgIcon
            fontSize="big"
            sx={{
              "& path": { stroke: `${COLORS.greySuit}` },
            }}
          >
            <Filter />
          </SvgIcon>

          <Typography variant="text3" color={COLORS.santasGrey}>
            {placeholder}
          </Typography>
        </Box>

        <SvgIcon
          sx={{
            fontSize: "16px",
            "& path": { fill: `${COLORS.greySuit}` },
          }}
        >
          <Cross />
        </SvgIcon>
      </Box>

      <Box sx={MenuBodyStyle}>
        {options.map((item) => (
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

      <Button
        onClick={handleClear}
        size="small"
        variant="text"
        sx={{ width: "100%", paddingY: "7px", borderRadius: "0 0 8px 8px" }}
      >
        Reset
      </Button>
    </Select>
  )
}
