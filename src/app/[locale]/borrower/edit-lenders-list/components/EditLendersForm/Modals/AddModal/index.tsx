import * as React from "react"
import { useEffect, useState } from "react"

import { Box, Button, Dialog, TextField, Typography } from "@mui/material"

import { AddSelect } from "@/app/[locale]/borrower/edit-lenders-list/components/EditLendersForm/Modals/AddModal/AddSelect"
import {
  EditLenderFlowStatuses,
  MarketTableDataType,
} from "@/app/[locale]/borrower/edit-lenders-list/interface"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setLendersTableData } from "@/store/slices/editLendersListSlice/editLendersListSlice"
import { COLORS } from "@/theme/colors"

import { useAddLenderForm } from "./useAddLenderForm"

export const AddModal = () => {
  const dispatch = useAppDispatch()

  const lendersTableData = useAppSelector(
    (state) => state.editLendersList.lendersTableData,
  )

  const selectedMarket = useAppSelector(
    (state) => state.editLendersList.marketFilter,
  )

  const isFilteredByMarket = selectedMarket.address !== "0x00"

  const [isOpen, setIsOpen] = useState(false)
  const [selectedMarkets, setSelectedMarkets] = useState<MarketTableDataType[]>(
    [],
  )
  const [isDisabled, setIsDisabled] = useState(false)

  const lendersNames: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const existingLenders = lendersTableData.map((lender) => lender.address)

  const lendersWithMarket = lendersTableData
    .filter((lender) =>
      lender.markets.some(
        (market) => market.address === selectedMarket.address,
      ),
    )
    .map((lender) => lender.address)

  const {
    getValues,
    setValue,
    watch,
    register,
    formState: { errors, isValid },
    reset,
  } = useAddLenderForm(isFilteredByMarket ? lendersWithMarket : existingLenders)

  const addressValue = watch("address")

  const existingLender = existingLenders.find(
    (lender) => lender.toLowerCase() === addressValue?.toLowerCase(),
  )

  useEffect(() => {
    if (existingLender) {
      setIsDisabled(true)
      const storedName = lendersNames[existingLender.toLowerCase()]

      if (storedName) {
        setValue("name", storedName)
      }
    } else {
      setIsDisabled(false)
      reset({ name: "" })
    }
  }, [existingLender])

  useEffect(() => {
    if (isFilteredByMarket) {
      setSelectedMarkets([
        {
          ...selectedMarket,
          status: EditLenderFlowStatuses.NEW,
        },
      ])
    }
  }, [selectedMarket, isOpen])

  const handleOpen = () => {
    reset()
    setSelectedMarkets([])
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const onSubmitLender = () => {
    dispatch(
      setLendersTableData([
        ...lendersTableData,
        {
          id: getValues("address"),
          address: getValues("address").toLowerCase(),
          markets: selectedMarkets.map((market) => ({
            name: market.name,
            address: market.address,
            status: EditLenderFlowStatuses.NEW,
          })),
          status: EditLenderFlowStatuses.NEW,
        },
      ]),
    )

    if (getValues("name") === "") {
      delete lendersNames[getValues("address").toLowerCase()]
    } else {
      lendersNames[getValues("address").toLowerCase()] = getValues("name")
      localStorage.setItem("lenders-name", JSON.stringify(lendersNames))
    }

    setIsOpen(false)
  }

  const onSubmitMarket = () => {
    dispatch(
      setLendersTableData(
        lendersTableData.map((lender) =>
          lender.address.toLowerCase() === getValues("address").toLowerCase()
            ? {
                ...lender,
                markets: [
                  ...lender.markets.filter(
                    (m) => m.address !== selectedMarket.address,
                  ),
                  {
                    ...selectedMarket,
                    status: EditLenderFlowStatuses.NEW,
                  },
                ],
              }
            : lender,
        ),
      ),
    )

    if (getValues("name") === "") {
      delete lendersNames[getValues("address").toLowerCase()]
    } else {
      lendersNames[getValues("address").toLowerCase()] = getValues("name")
      localStorage.setItem("lenders-name", JSON.stringify(lendersNames))
    }

    setIsOpen(false)
  }

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="contained"
        color="secondary"
        size="small"
        sx={{
          height: "32px",
          fontSize: "13px",
          lineHeight: "16px",
          fontWeight: 600,
        }}
      >
        + Add Lender
      </Button>

      <Dialog
        open={isOpen}
        onClose={handleClose}
        sx={{
          "& .MuiDialog-paper": {
            minHeight: "404px",
            width: "440px",
            border: "none",
            borderRadius: "20px",
            margin: 0,
            padding: "24px 0",
          },
        }}
      >
        <TxModalHeader
          title="Add a new lender"
          crossOnClick={null}
          arrowOnClick={handleClose}
        />

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "8px 24px 0px 24px",
            marginBottom: "auto",
            width: "100%",
          }}
        >
          <TextField
            fullWidth
            size="medium"
            label="Wallet Address"
            {...register("address")}
            error={!!errors.address}
          />

          <TextField
            fullWidth
            size="medium"
            label={isDisabled ? "" : "Enter name"}
            {...register("name")}
            error={!!errors.name}
            disabled={isDisabled}
          />

          {!isFilteredByMarket && (
            <AddSelect
              selectedMarkets={selectedMarkets}
              setSelectedMarkets={setSelectedMarkets}
              disabled={isDisabled}
            />
          )}

          {isFilteredByMarket && (
            <TextField
              sx={{
                "& .MuiFormLabel-root.Mui-disabled": {
                  color: COLORS.santasGrey,
                },
              }}
              fullWidth
              size="medium"
              label={selectedMarket.name}
              disabled
            />
          )}

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              maxWidth: "392px",
            }}
          >
            {errors.address && (
              <Box
                sx={{ display: "flex", alignItems: "flex-start", gap: "4px" }}
              >
                <Box
                  sx={{
                    width: "3px",
                    height: "3px",
                    marginTop: "6.5px",
                    backgroundColor: COLORS.wildWatermelon,
                    borderRadius: "50%",
                  }}
                />
                <Typography variant="text4" color={COLORS.wildWatermelon}>
                  {errors.address?.message}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Button
          onClick={
            isFilteredByMarket && !!existingLender
              ? onSubmitMarket
              : onSubmitLender
          }
          disabled={!isValid || selectedMarkets.length === 0}
          variant="contained"
          size="large"
          type="submit"
          sx={{ margin: "24px 24px 0" }}
        >
          Add
        </Button>
      </Dialog>
    </>
  )
}
