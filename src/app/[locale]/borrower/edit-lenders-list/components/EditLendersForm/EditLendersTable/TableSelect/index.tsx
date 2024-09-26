import * as React from "react"
import { ChangeEvent, useRef, useState } from "react"

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

import {
  ChipContainer,
  InputLabelStyle,
  MenuBox,
  MenuStyle,
  SelectStyle,
  VariantsContainer,
} from "@/app/[locale]/borrower/edit-lenders/components/MarketSelect/TableLenderSelect/style"
import {
  EditLenderFlowStatuses,
  MarketTableDataType,
} from "@/app/[locale]/borrower/edit-lenders-list/interface"
import Icon from "@/assets/icons/search_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setLendersTableData } from "@/store/slices/editLendersListSlice/editLendersListSlice"
import { COLORS } from "@/theme/colors"

export type TableSelectProps = {
  lenderAddress: `0x${string}`
  lenderMarkets: MarketTableDataType[]
}

export const TableSelect = ({
  lenderAddress,
  lenderMarkets,
}: TableSelectProps) => {
  const dispatch = useAppDispatch()

  // Select settings
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
  const lendersTableData = useAppSelector(
    (state) => state.editLendersList.lendersTableData,
  )

  const updateLenderMarkets = (updatedMarkets: MarketTableDataType[]) => {
    dispatch(
      setLendersTableData(
        lendersTableData.map((lender) =>
          lender.address === lenderAddress
            ? { ...lender, markets: updatedMarkets }
            : lender,
        ),
      ),
    )
  }

  const handleChangeMarkets = (
    event: React.ChangeEvent<HTMLInputElement>,
    market: { name: string; address: string },
  ) => {
    const isChecked = event.target.checked

    const existingMarket = lenderMarkets.find(
      (m) => m.address === market.address,
    )

    const isMarketExisted =
      existingMarket?.prevStatus === EditLenderFlowStatuses.OLD ||
      existingMarket?.status === EditLenderFlowStatuses.OLD

    let updatedMarkets

    if (isChecked) {
      updatedMarkets = [
        ...lenderMarkets.filter((m) => m.address !== market.address),
        {
          ...market,
          status: isMarketExisted
            ? EditLenderFlowStatuses.OLD
            : EditLenderFlowStatuses.NEW,
          prevStatus: isMarketExisted
            ? EditLenderFlowStatuses.OLD
            : EditLenderFlowStatuses.NEW,
        },
      ]
    } else {
      updatedMarkets = lenderMarkets.reduce((acc, m) => {
        if (m.address === market.address) {
          if (isMarketExisted) {
            acc.push({
              ...m,
              status: EditLenderFlowStatuses.DELETED,
              prevStatus: EditLenderFlowStatuses.OLD,
            })
          }
        } else {
          acc.push(m)
        }
        return acc
      }, [] as MarketTableDataType[])
    }

    updateLenderMarkets(updatedMarkets)
  }

  const handleChangeAllMarkets = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const isChecked = event.target.checked

    const existingMarkets = lenderMarkets.filter(
      (market) => market.status !== EditLenderFlowStatuses.DELETED,
    )

    const restoredMarkets = lenderMarkets
      .filter(
        (market) =>
          market.status === EditLenderFlowStatuses.DELETED ||
          market.prevStatus === EditLenderFlowStatuses.DELETED,
      )
      .map((market) => ({
        ...market,
        status: EditLenderFlowStatuses.OLD,
        prevStatus: EditLenderFlowStatuses.DELETED,
      }))

    const newMarkets = activeBorrowerMarkets
      .filter(
        (borrowerMarket) =>
          !lenderMarkets.some(
            (lenderMarket) => lenderMarket.address === borrowerMarket.address,
          ),
      )
      .map((market) => ({
        ...market,
        status: EditLenderFlowStatuses.NEW,
        prevStatus: EditLenderFlowStatuses.NEW,
      }))

    let updatedMarkets: MarketTableDataType[]

    if (isChecked) {
      updatedMarkets = [...existingMarkets, ...restoredMarkets, ...newMarkets]
    } else if (
      lenderMarkets.filter(
        (market) => market.prevStatus === EditLenderFlowStatuses.OLD,
      ).length === activeBorrowerMarkets.length
    ) {
      updatedMarkets = lenderMarkets.map((market) => ({
        ...market,
        status: EditLenderFlowStatuses.DELETED,
        prevStatus: EditLenderFlowStatuses.OLD,
      }))
    } else {
      updatedMarkets = [
        ...lenderMarkets
          .filter((market) => market.status !== EditLenderFlowStatuses.NEW)
          .map((market) =>
            market.prevStatus === EditLenderFlowStatuses.DELETED
              ? {
                  ...market,
                  status: EditLenderFlowStatuses.DELETED,
                  prevStatus: EditLenderFlowStatuses.OLD,
                }
              : market,
          ),
      ]
    }

    updateLenderMarkets(updatedMarkets)
  }

  const handleAddAllMarkets = () => {
    const newMarkets = activeBorrowerMarkets
      .filter(
        (borrowerMarket) =>
          !lenderMarkets.some(
            (lenderMarket) => lenderMarket.address === borrowerMarket.address,
          ),
      )
      .map((market) => ({
        ...market,
        status: EditLenderFlowStatuses.NEW,
        prevStatus: EditLenderFlowStatuses.NEW,
      }))

    const oldMarkets = lenderMarkets.map((market) =>
      market.status === EditLenderFlowStatuses.DELETED
        ? {
            ...market,
            status: EditLenderFlowStatuses.OLD,
            prevStatus: EditLenderFlowStatuses.DELETED,
          }
        : market,
    )

    const updatedMarkets = [...oldMarkets, ...newMarkets]

    updateLenderMarkets(updatedMarkets)
  }

  const handleDeleteAllMarkets = () => {
    const updatedMarkets = lenderMarkets.reduce((acc, market) => {
      if (market.status !== EditLenderFlowStatuses.NEW) {
        acc.push({
          ...market,
          prevStatus: EditLenderFlowStatuses.OLD,
          status: EditLenderFlowStatuses.DELETED,
        })
      }
      return acc
    }, [] as MarketTableDataType[])

    updateLenderMarkets(updatedMarkets)
  }

  const handleDeleteMarket = (market: MarketTableDataType) => {
    const existingMarket = lenderMarkets.find(
      (m) => m.address === market.address,
    )

    const isMarketExisted =
      existingMarket?.prevStatus === EditLenderFlowStatuses.OLD

    const updatedMarkets = lenderMarkets.reduce((acc, m) => {
      if (m.address === market.address) {
        if (isMarketExisted) {
          acc.push({
            ...m,
            status: EditLenderFlowStatuses.DELETED,
            prevStatus: EditLenderFlowStatuses.OLD,
          })
        }
      } else {
        acc.push(m)
      }
      return acc
    }, [] as MarketTableDataType[])

    updateLenderMarkets(updatedMarkets)
  }

  const restorePreviousStatus = (market: MarketTableDataType) => {
    const updatedMarkets = lenderMarkets.map((m) =>
      m.address === market.address
        ? {
            ...m,
            status: m.prevStatus,
          }
        : m,
    )

    updateLenderMarkets(updatedMarkets)
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
        MenuProps={MenuStyle}
        renderValue={() => (
          <Box sx={ChipContainer}>
            {isAssignedToAll ? (
              <LendersMarketChip
                marketName="All markets"
                withButton
                width="fit-content"
                onClick={() => handleDeleteAllMarkets()}
              />
            ) : (
              lenderMarkets.map((market) => (
                <LendersMarketChip
                  key={market.address}
                  marketName={market.name}
                  withButton
                  width="fit-content"
                  onClick={() =>
                    market.status === EditLenderFlowStatuses.DELETED
                      ? restorePreviousStatus(market)
                      : handleDeleteMarket(market)
                  }
                  type={market.status}
                />
              ))
            )}
          </Box>
        )}
      >
        <Box sx={MenuBox}>
          <TextField
            onChange={handleChangeMarketName}
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

        <Box sx={VariantsContainer}>
          <FormControlLabel
            label="All Markets"
            control={
              <ExtendedCheckbox
                onChange={(event) => handleChangeAllMarkets(event)}
                checked={isAssignedToAll}
                sx={{
                  "& ::before": {
                    transform: "translate(-3px, -3px) scale(0.75)",
                  },
                }}
              />
            }
          />
          {filteredMarketsByName.map((market) => (
            <FormControlLabel
              key={market.address}
              label={market.name}
              sx={{ marginLeft: "14px" }}
              control={
                <ExtendedCheckbox
                  value={market}
                  onChange={(event) => handleChangeMarkets(event, market)}
                  checked={lenderMarkets.some(
                    (chosenMarket) =>
                      chosenMarket.address === market.address &&
                      chosenMarket.status !== EditLenderFlowStatuses.DELETED,
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
          onClick={handleDeleteAllMarkets}
          size="medium"
          variant="contained"
          color="secondary"
          sx={{ width: "100%", marginTop: "12px" }}
        >
          Reset
        </Button>
      </Select>
    </FormControl>
  )
}
