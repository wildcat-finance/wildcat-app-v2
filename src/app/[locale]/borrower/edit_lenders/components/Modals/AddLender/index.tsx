import React, { useEffect, useState } from "react"

import { Box, Button, Dialog, TextField, Typography } from "@mui/material"

import {
  DialogBody,
  DialogContainer,
  OpenModalButton,
} from "@/app/[locale]/borrower/edit_lenders/components/Modals/AddLender/style"
import { useAddLenderForm } from "@/app/[locale]/borrower/edit_lenders/components/Modals/AddLender/useAddLenderForm"
import { MarketTableT } from "@/app/[locale]/borrower/edit_lenders/interface"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { COLORS } from "@/theme/colors"

import { AddLenderModalProps } from "./interface"
import { AddLenderSelect } from "../../MarketSelect/AddLenderSelect"

export const AddLenderModal = ({
  setLendersRows,
  setLendersNames,
  borrowerMarkets,
  existingLenders,
}: AddLenderModalProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMarkets, setSelectedMarkets] = useState<MarketTableT[]>([])
  const [isDisabled, setIsDisabled] = useState(false)

  const {
    getValues,
    setValue,
    watch,
    register,
    formState: { errors, isValid },
    reset,
  } = useAddLenderForm(existingLenders)

  const isExistingLenderError =
    errors.address?.message ===
    "The lender with this address is already added. Use Edit Lender List page to edit"

  const handleOpen = () => {
    reset()
    setSelectedMarkets([])
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const onSubmit = () => {
    setLendersRows((prev) => [
      ...prev,
      {
        id: getValues("address"),
        isAuthorized: true,
        name: {
          name: getValues("name"),
          address: getValues("address"),
        },
        address: getValues("address"),
        markets: selectedMarkets.map((market) => ({
          name: market.name,
          address: market.address,
          status: "new",
          prevStatus: "new",
        })),
        status: "new",
        prevStatus: "new",
      },
    ])

    setLendersNames((prev) => {
      if (getValues("name") === "") {
        delete prev[getValues("address")]
      } else {
        prev[getValues("address")] = getValues("name")
        localStorage.setItem("lenders-name", JSON.stringify(prev))
      }
      return prev
    })

    setIsOpen(false)
  }

  const lendersName: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const addressValue = watch("address")

  const existingLender = existingLenders.find(
    (lender) => lender.toLowerCase() === addressValue?.toLowerCase(),
  )

  useEffect(() => {
    if (existingLender) {
      setIsDisabled(true)
      const storedName = lendersName[existingLender.toLowerCase()]

      if (storedName) {
        setValue("name", storedName)
      }
    } else {
      setIsDisabled(false)
      reset({ name: "" })
    }
  }, [isExistingLenderError])

  return (
    <>
      <Button
        size="small"
        variant="contained"
        sx={OpenModalButton}
        onClick={handleOpen}
      >
        <Typography
          variant="text3"
          color="white"
          sx={{ position: "relative", bottom: "1px" }}
        >
          +
        </Typography>
        Add Lender
      </Button>

      <Dialog open={isOpen} onClose={handleClose} sx={DialogContainer}>
        <TxModalHeader
          title="Add a new lender"
          crossOnClick={null}
          arrowOnClick={handleClose}
        />

        <Box sx={DialogBody}>
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

          <AddLenderSelect
            borrowerMarkets={borrowerMarkets}
            selectedMarkets={selectedMarkets}
            setSelectedMarkets={setSelectedMarkets}
            disabled={isDisabled}
          />

          {errors && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                maxWidth: "392px",
              }}
            >
              {errors.name && (
                <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Box
                    sx={{
                      width: "3px",
                      height: "3px",
                      backgroundColor: COLORS.wildWatermelon,
                      borderRadius: "50%",
                    }}
                  />
                  <Typography variant="text4" color={COLORS.wildWatermelon}>
                    {errors.name?.message}
                  </Typography>
                </Box>
              )}

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
          )}
        </Box>

        <Button
          onClick={onSubmit}
          disabled={!isValid}
          variant="contained"
          size="large"
          type="submit"
          sx={{ margin: "0 24px" }}
        >
          Add
        </Button>
      </Dialog>
    </>
  )
}
