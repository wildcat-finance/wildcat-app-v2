import * as React from "react"
import { ChangeEvent, useEffect, useRef, useState } from "react"

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
} from "@mui/material"
import { useTranslation } from "react-i18next"

import {
  EditLenderFlowStatuses,
  MarketTableDataType,
} from "@/app/[locale]/borrower/edit-lenders-list/interface"
import Icon from "@/assets/icons/search_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { COLORS } from "@/theme/colors"

import { TableSelectProps } from "./interface"
import {
  ChipContainer,
  InputLabelStyle,
  MenuBox,
  MenuStyle,
  SelectStyle,
  VariantsContainer,
  VariantStyles,
} from "./style"

export const TableSelect = ({
  lenderAddress,
  lenderMarkets,
  lenderStatus,
}: TableSelectProps) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false)

  console.log(`Table Select!`)
  console.log(lenderMarkets)

  // Getting active borrower markets from the store
  const activeBorrowerMarkets = useAppSelector(
    (state) => state.editLendersList.activeBorrowerMarkets,
  )

  const isAssignedToAll =
    activeBorrowerMarkets.length ===
    lenderMarkets.filter(
      (market) => market.status !== EditLenderFlowStatuses.DELETED,
    ).length

  const [marketName, setMarketName] = useState("")

  const filteredMarketsByName = activeBorrowerMarkets.filter((market) =>
    market.name.toLowerCase().includes(marketName.toLowerCase()),
  )

  const handleChangeMarketName = (evt: ChangeEvent<HTMLInputElement>) => {
    setMarketName(evt.target.value)
  }

  // Editing functions
  const lenderMarketsAmount = lenderMarkets.filter(
    (market) => market.status !== EditLenderFlowStatuses.DELETED,
  ).length

  const lendersTableData = useAppSelector(
    (state) => state.editLendersList.lendersTableData,
  )
  // Select settings
  const selectRef = useRef<HTMLElement>(null)

  const onOpen = () => {
    if (selectRef.current) {
      selectRef.current.classList.add("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.add("Mui-focused")
    }

    setMarketName("")
  }

  const onClose = () => {
    if (selectRef.current) {
      selectRef.current.classList.remove("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.remove("Mui-focused")
    }
  }

  return (
    <FormControl fullWidth>
      <InputLabel sx={InputLabelStyle}>Add market</InputLabel>

      <Select
        value={lenderMarkets}
        multiple
        ref={selectRef}
        onOpen={onOpen}
        onClose={onClose}
        size="small"
        sx={SelectStyle}
        MenuProps={{
          sx: MenuStyle,
          anchorOrigin: {
            vertical: "bottom",
            horizontal: "left",
          },
          transformOrigin: {
            vertical: "top",
            horizontal: "left",
          },
        }}
        renderValue={() => (
          <Box sx={ChipContainer}>
            {lenderMarkets.map((market) => (
              <LendersMarketChip
                key={market.address}
                marketName={market.name}
                width="fit-content"
                type={market.status}
              />
            ))}
          </Box>
        )}
      />
    </FormControl>
  )
}
