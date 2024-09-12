import { ChangeEvent, useRef, useState } from "react"
import * as React from "react"

import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  Select,
  SvgIcon,
  TextField,
} from "@mui/material"

import { MarketTableT } from "@/app/[locale]/borrower/edit-lenders/interface"
import { MarketDataT } from "@/app/[locale]/borrower/edit-lenders/lendersMock"
import Cross from "@/assets/icons/cross_icon.svg"
import Icon from "@/assets/icons/search_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { COLORS } from "@/theme/colors"

import { TableLenderSelectProps } from "./interface"
import {
  ChipContainer,
  DeleteButtonStyle,
  InputLabelStyle,
  MenuBox,
  MenuStyle,
  SelectStyle,
  VariantsContainer,
} from "./style"

export const TableLenderSelect = ({
  borrowerMarkets,
  lenderMarkets,
  lenderAddress,
  lenderStatus,
  setLendersRows,
  handleAddAllMarkets,
  disabled,
}: TableLenderSelectProps) => {
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

  const [marketName, setMarketName] = useState("")

  const filteredMarketsByName = borrowerMarkets.filter((market) =>
    market.name.toLowerCase().includes(marketName.toLowerCase()),
  )

  const handleChangeMarketName = (evt: ChangeEvent<HTMLInputElement>) => {
    setMarketName(evt.target.value)
  }

  const updateLenderMarkets = (updatedMarkets: MarketTableT[]) => {
    setLendersRows((prev) =>
      prev.map((lender) =>
        lender.address === lenderAddress
          ? { ...lender, markets: updatedMarkets }
          : lender,
      ),
    )
  }

  const handleChangeMarkets = (
    event: React.ChangeEvent<HTMLInputElement>,
    market: MarketDataT,
  ) => {
    const initialMarket = lenderMarkets.find(
      (m) => m.address === market.address,
    )
    const isMarketOld = initialMarket?.prevStatus === "old"

    let updatedMarkets

    if (event.target.checked) {
      updatedMarkets = [
        ...lenderMarkets.filter((m) => m.address !== market.address),
        {
          ...market,
          status: isMarketOld ? ("old" as const) : ("new" as const),
          prevStatus: isMarketOld ? ("old" as const) : ("new" as const),
        },
      ]
    } else {
      updatedMarkets = lenderMarkets.reduce((acc, m) => {
        if (m.address === market.address) {
          if (isMarketOld) {
            acc.push({
              ...m,
              prevStatus: "old" as const,
              status: "deleted" as const,
            })
          }
        } else {
          acc.push(m)
        }
        return acc
      }, [] as MarketTableT[])
    }

    updateLenderMarkets(updatedMarkets)
  }

  const handleDeleteMarket = (marketToDelete: MarketTableT) => {
    const initialMarket = lenderMarkets.find(
      (m) => m.address === marketToDelete.address,
    )
    const isMarketOld = initialMarket?.status === "old"

    const updatedMarkets = lenderMarkets.reduce((acc, market) => {
      if (market.address === marketToDelete.address) {
        if (isMarketOld) {
          acc.push({
            ...market,
            prevStatus: "old",
            status: "deleted",
          })
        }
      } else {
        acc.push(market)
      }
      return acc
    }, [] as MarketTableT[])

    updateLenderMarkets(updatedMarkets)
  }

  const restorePreviousStatus = (marketToRestore: MarketTableT) => {
    const updatedMarkets = lenderMarkets.map((market) =>
      market.address === marketToRestore.address
        ? {
            ...market,
            status: market.prevStatus,
          }
        : market,
    )

    updateLenderMarkets(updatedMarkets)
  }

  const handleReset = () => {
    const updatedMarkets = lenderMarkets.reduce((acc, market) => {
      if (market.status !== "new") {
        acc.push({
          ...market,
          prevStatus: "old" as const,
          status: "deleted" as const,
        })
      }
      return acc
    }, [] as MarketTableT[])

    updateLenderMarkets(updatedMarkets)
  }

  const handleResetAllMarkets = () => {
    setLendersRows((prevLenders) =>
      prevLenders.map((lender) => {
        if (lender.address === lenderAddress) {
          const oldMarkets = lenderMarkets
            .filter(
              (market) =>
                market.status === "old" || market.prevStatus === "old",
            )
            .map((market) =>
              market.prevStatus === "deleted"
                ? {
                    ...market,
                    status: "deleted" as const,
                    prevStatus: "old" as const,
                  }
                : market,
            )

          if (oldMarkets.length === borrowerMarkets.length) {
            return {
              ...lender,
              markets: [],
            }
          }

          return {
            ...lender,
            markets: [...oldMarkets],
          }
        }
        return lender
      }),
    )
  }

  return (
    <FormControl fullWidth>
      <InputLabel sx={InputLabelStyle}>Add market</InputLabel>

      <Select
        ref={selectRef}
        onOpen={onOpen}
        onClose={onClose}
        value={lenderMarkets}
        disabled={disabled}
        size="small"
        multiple
        sx={SelectStyle}
        endAdornment={
          <IconButton
            // onClick={handleReset}
            onClick={() => {
              if (lenderStatus === "new") {
                setLendersRows((prev) =>
                  prev.filter((item) => item.address !== lenderAddress),
                )
              } else if (lenderStatus === "old") {
                setLendersRows((prev) =>
                  prev.map((item) => {
                    if (item.address === lenderAddress) {
                      return {
                        ...item,
                        prevStatus: item.status,
                        status: "deleted",
                      }
                    }
                    return item
                  }),
                )
              }
            }}
            sx={DeleteButtonStyle}
            disabled={disabled}
          >
            <SvgIcon
              fontSize="small"
              sx={{
                "& path": { fill: `${COLORS.santasGrey}` },
              }}
            >
              <Cross />
            </SvgIcon>
          </IconButton>
        }
        renderValue={() => (
          <Box sx={ChipContainer}>
            {lenderMarkets.length === borrowerMarkets.length ? (
              <LendersMarketChip
                marketName="All markets"
                withButton
                width="fit-content"
                type="old"
                onClick={handleResetAllMarkets}
              />
            ) : (
              lenderMarkets.map((market) => (
                <LendersMarketChip
                  key={market.address}
                  marketName={market.name}
                  withButton
                  width="fit-content"
                  onClick={() =>
                    market.status === "deleted"
                      ? restorePreviousStatus(market)
                      : handleDeleteMarket(market)
                  }
                  disabled={disabled}
                  type={market.status}
                />
              ))
            )}
          </Box>
        )}
        MenuProps={MenuStyle}
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
                onChange={(event) =>
                  handleAddAllMarkets(event, lenderAddress, lenderMarkets)
                }
                checked={lenderMarkets.length === borrowerMarkets.length}
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
                      chosenMarket.status !== "deleted",
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
          onClick={handleReset}
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
