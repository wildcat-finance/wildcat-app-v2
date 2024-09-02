import React, { useEffect, useState } from "react"

import { Box, Button, Dialog, TextField, Typography } from "@mui/material"

import { AddLenderModalProps } from "@/app/[locale]/borrower/edit_lenders/components/Modals/AddLender/interface"
import {
  DialogBody,
  DialogContainer,
  OpenModalButton,
} from "@/app/[locale]/borrower/edit_lenders/components/Modals/AddLender/style"
import { useAddLenderForm } from "@/app/[locale]/borrower/edit_lenders/components/Modals/AddLender/useAddLenderForm"
import { MarketTableT } from "@/app/[locale]/borrower/edit_lenders/interface"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { COLORS } from "@/theme/colors"

import { AddLenderSelect } from "../../MarketSelect/AddLenderSelect"

export const AddLenderModal = ({
  setLendersRows,
  setLendersNames,
  borrowerMarkets,
  existingLenders,
}: AddLenderModalProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMarkets, setSelectedMarkets] = useState<MarketTableT[]>([])
  const [isNameDisabled, setIsNameDisabled] = useState(false)

  const lendersName: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const {
    getValues,
    setValue,
    register,
    watch,
    formState: { errors, isValid },
    reset,
    handleSubmit,
  } = useAddLenderForm()

  const addressValue = watch("address")

  const handleOpen = () => {
    reset()
    setSelectedMarkets([])
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  useEffect(() => {
    const existingLender = existingLenders.find(
      (lender) => lender.toLowerCase() === addressValue?.toLowerCase(),
    )

    if (existingLender) {
      const storedName = lendersName[existingLender.toLowerCase()]

      if (storedName) {
        setValue("name", storedName)
        setIsNameDisabled(true)
      }
    } else {
      setIsNameDisabled(false)
      setValue("name", "")
    }
  }, [addressValue, existingLenders, lendersName, setValue])

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
        })),
        status: "new",
        prevStatus: "new",
      },
    ])

    setLendersNames((prev) => {
      if (getValues("name") === "") {
        delete prev[getValues("address").toLowerCase()]
      } else {
        prev[getValues("address").toLowerCase()] = getValues("name")
        localStorage.setItem("lenders-name", JSON.stringify(prev))
      }
      return prev
    })

    setIsOpen(false)
  }

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
            label={isNameDisabled ? "" : "Enter name"}
            disabled={isNameDisabled}
            {...register("name")}
            error={!!errors.name}
          />

          <AddLenderSelect
            borrowerMarkets={borrowerMarkets}
            selectedMarkets={selectedMarkets}
            setSelectedMarkets={setSelectedMarkets}
          />

          {errors && (
            <Box sx={{ display: "flex", flexDirection: "column" }}>
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
                    {errors.address?.message}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>

        <Button
          onClick={handleSubmit(onSubmit)}
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
