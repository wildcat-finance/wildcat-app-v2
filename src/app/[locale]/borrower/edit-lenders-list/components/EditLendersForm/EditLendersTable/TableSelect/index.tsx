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

import {
  ChipContainer,
  InputLabelStyle,
  MenuBox,
  SelectStyle,
  VariantsContainer,
} from "@/app/[locale]/borrower/edit-lenders/components/MarketSelect/TableLenderSelect/style"
import { DeleteModal } from "@/app/[locale]/borrower/edit-lenders-list/components/EditLendersForm/Modals/DeleteModal"
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
  lenderStatus: EditLenderFlowStatuses
}

export const TableSelect = ({
  lenderAddress,
  lenderMarkets,
  lenderStatus,
}: TableSelectProps) => {
  const dispatch = useAppDispatch()

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false)

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
  const lenderMarketsAmount = lenderMarkets.filter(
    (market) => market.status !== EditLenderFlowStatuses.DELETED,
  ).length

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
      existingMarket?.status === EditLenderFlowStatuses.OLD ||
      existingMarket?.status === EditLenderFlowStatuses.DELETED

    if (
      lenderStatus === EditLenderFlowStatuses.NEW &&
      lenderMarketsAmount === 1 &&
      !isChecked
    ) {
      setIsDeleteModalOpen(true)
      return
    }

    let updatedMarkets

    if (isChecked) {
      updatedMarkets = [
        ...lenderMarkets.filter((m) => m.address !== market.address),
        {
          ...market,
          status: isMarketExisted
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

  const handleDeleteMarket = (market: MarketTableDataType) => {
    const isMarketOld = market.status === EditLenderFlowStatuses.OLD

    const updatedMarkets = lenderMarkets.reduce((acc, m) => {
      if (m.address === market.address) {
        if (isMarketOld) {
          acc.push({
            ...m,
            status: EditLenderFlowStatuses.DELETED,
          })
        }
      } else {
        acc.push(m)
      }
      return acc
    }, [] as MarketTableDataType[])

    if (
      lenderStatus === EditLenderFlowStatuses.NEW &&
      lenderMarketsAmount === 1
    ) {
      setIsDeleteModalOpen(true)
    } else {
      updateLenderMarkets(updatedMarkets)
    }
  }

  const handleRestoreMarket = (market: MarketTableDataType) => {
    const updatedMarkets = lenderMarkets.map((m) =>
      m.address === market.address
        ? {
            ...m,
            status: EditLenderFlowStatuses.OLD,
          }
        : m,
    )

    updateLenderMarkets(updatedMarkets)
  }

  const handleDeleteAllMarkets = () => {
    const updatedMarkets = lenderMarkets.reduce((acc, market) => {
      if (market.status !== EditLenderFlowStatuses.NEW) {
        acc.push({
          ...market,
          status: EditLenderFlowStatuses.DELETED,
        })
      }
      return acc
    }, [] as MarketTableDataType[])

    if (lenderStatus === EditLenderFlowStatuses.NEW) {
      setIsDeleteModalOpen(true)
    } else {
      updateLenderMarkets(updatedMarkets)
    }
  }

  const handleChangeAllMarkets = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    let updatedMarkets

    const isChecked = event.target.checked

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
          }
        : market,
    )

    if (isChecked) {
      updatedMarkets = [...newMarkets, ...oldMarkets]

      updateLenderMarkets(updatedMarkets)
    } else {
      handleDeleteAllMarkets()
    }
  }

  // Autodeleting lender

  useEffect(() => {
    if (lenderStatus === EditLenderFlowStatuses.OLD) {
      if (lenderMarketsAmount === 0) {
        dispatch(
          setLendersTableData(
            lendersTableData.map((lender) => {
              if (lender.address === lenderAddress) {
                return {
                  ...lender,
                  markets: lender.markets
                    .filter(
                      (market) => market.status !== EditLenderFlowStatuses.NEW,
                    )
                    .map((market) => ({
                      ...market,
                      status: EditLenderFlowStatuses.DELETED,
                    })),
                  status: EditLenderFlowStatuses.DELETED,
                }
              }
              return lender
            }),
          ),
        )
      } else {
        dispatch(
          setLendersTableData(
            lendersTableData.map((lender) => {
              if (lender.address === lenderAddress) {
                return {
                  ...lender,
                  status: EditLenderFlowStatuses.OLD,
                }
              }
              return lender
            }),
          ),
        )
      }
    }
  }, [lenderMarketsAmount])

  return (
    <>
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
            sx: {
              "& .MuiPaper-root": {
                width: "295px",
                fontFamily: "inherit",
                padding: "12px",
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
                        ? handleRestoreMarket(market)
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
                sx={{
                  width: "235px",
                  marginLeft: "14px",

                  "& .MuiTypography-root": {
                    maxWidth: "210px",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    overflowX: "hidden",
                  },
                }}
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

      <DeleteModal
        isOpen={isDeleteModalOpen}
        setIsOpen={setIsDeleteModalOpen}
        lenderAddress={lenderAddress}
      />
    </>
  )
}
