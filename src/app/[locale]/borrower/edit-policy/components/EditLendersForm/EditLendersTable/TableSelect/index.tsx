import * as React from "react"
import { useRef, useState } from "react"

import { Box, FormControl, InputLabel, Select } from "@mui/material"

import { LendersMarketChip } from "@/components/LendersMarketChip"

import { TableSelectProps } from "./interface"
import { ChipContainer, InputLabelStyle, MenuStyle, SelectStyle } from "./style"

export const TableSelect = ({ lenderMarkets }: TableSelectProps) => {
  console.log(`Table Select!`)
  console.log(lenderMarkets)

  /*
  // Getting active borrower markets from the store
  const activeBorrowerMarkets = useAppSelector(
    (state) => state.editLendersList.activeBorrowerMarkets,
  )

  const isAssignedToAll =
    activeBorrowerMarkets.length ===
    lenderMarkets.filter(
      (market) => market.status !== EditLenderFlowStatuses.DELETED,
    ).length
  */

  const [, setMarketName] = useState("")

  /*
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
  */

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
