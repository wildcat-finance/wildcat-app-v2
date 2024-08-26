import React, { useState } from "react"

import { Box, Button, Dialog, TextField, Typography } from "@mui/material"
import { useForm } from "react-hook-form"

import {
  DialogBody,
  DialogContainer,
  OpenModalButton,
} from "@/app/[locale]/borrower/edit_lenders/components/Modals/AddLender/style"
import { MarketTableT } from "@/app/[locale]/borrower/edit_lenders/interface"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { COLORS } from "@/theme/colors"

import { AddLenderModalProps } from "./interface"
import { AddLenderSelect } from "../../MarketSelect/AddLenderSelect"

export const AddLenderModal = ({
  setLendersRows,
  setLendersNames,
  borrowerMarkets,
}: AddLenderModalProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMarkets, setSelectedMarkets] = useState<MarketTableT[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    mode: "onChange", // Режим валидации, проверка на потере фокуса
    defaultValues: {
      name: "",
      address: "",
    },
  })

  const handleOpen = () => {
    reset()
    setSelectedMarkets([])
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const onSubmit = (data: { name: string; address: string }) => {
    setLendersRows((prev) => [
      ...prev,
      {
        id: data.address,
        isAuthorized: true,
        name: {
          name: data.name,
          address: data.address,
        },
        address: data.address,
        markets: selectedMarkets.map((market) => ({
          name: market.name,
          address: market.address,
          status: "new",
        })),
        status: "new",
      },
    ])
    setLendersNames((prev) => {
      if (data.name === "") {
        delete prev[data.address.toLowerCase()]
      } else {
        prev[data.address.toLowerCase()] = data.name
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

        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={DialogBody}>
          <TextField
            fullWidth
            size="medium"
            label="Enter name"
            {...register("name", {
              required: "Name is required",
              minLength: {
                value: 2,
                message: "Name must be longer than 1 character",
              },
              pattern: {
                value: /^[A-Za-z]+$/,
                message: "Use only letters for Entering Name",
              },
            })}
            error={!!errors.name}
          />

          <TextField
            fullWidth
            size="medium"
            label="Wallet Address"
            {...register("address", {
              required: "Address is required",
              validate: {
                startsWith0x: (value) =>
                  value.startsWith("0x") || "Address must start with 0x",
                length42: (value) =>
                  value.length === 42 ||
                  "Address must be exactly 42 characters long",
              },
            })}
            error={!!errors.address}
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
                  <Typography
                    sx={{
                      fontSize: "10px",
                      lineHeight: "16px",
                      color: COLORS.wildWatermelon,
                    }}
                  >
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
                  <Typography
                    sx={{
                      fontSize: "10px",
                      lineHeight: "16px",
                      color: COLORS.wildWatermelon,
                    }}
                  >
                    {errors.address?.message}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>

        <Button
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
