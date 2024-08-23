import React, { useState } from "react"

import { Box, Button, Dialog, TextField, Typography } from "@mui/material"

import {
  DialogBody,
  DialogContainer,
  OpenModalButton,
} from "@/app/[locale]/borrower/edit_lenders/components/Modals/AddLender/style"
import { MarketTableT } from "@/app/[locale]/borrower/edit_lenders/interface"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"

import { AddLenderModalProps } from "./interface"
import { AddLenderSelect } from "../../MarketSelect/AddLenderSelect"

export const AddLenderModal = ({
  setLendersRows,
  setLendersNames,
  borrowerMarkets,
}: AddLenderModalProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const [newLenderData, setNewLenderData] = useState<{
    name: string
    address: string
  }>({
    name: "",
    address: "",
  })

  const [selectedMarkets, setSelectedMarkets] = useState<MarketTableT[]>([])

  const handleOpen = () => {
    setNewLenderData({
      name: "",
      address: "",
    })
    setSelectedMarkets([])
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleAddLender = () => {
    setLendersRows((prev) => [
      ...prev,
      {
        id: newLenderData.address,
        isAuthorized: true,
        name: {
          name: newLenderData.name,
          address: newLenderData.address,
        },
        address: newLenderData.address,
        markets: selectedMarkets.map((market) => ({
          name: market.name,
          address: market.address,
          status: "new",
        })),
        status: "new",
      },
    ])
    setLendersNames((prev) => {
      if (newLenderData.name === "") {
        delete prev[newLenderData.address.toLowerCase()]
      } else {
        prev[newLenderData.address.toLowerCase()] = newLenderData.name
        localStorage.setItem("lenders-name", JSON.stringify(prev))
      }
      return prev
    })

    setIsOpen(false)
  }

  const disableButton =
    newLenderData.name === "" ||
    !newLenderData.address.startsWith("0x") ||
    newLenderData.address.length !== 42

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
            label="Enter name"
            value={newLenderData.name}
            onChange={(e) => {
              setNewLenderData((prev) => ({ ...prev, name: e.target.value }))
            }}
          />

          <TextField
            fullWidth
            size="medium"
            label="Wallet Address"
            value={newLenderData.address}
            onChange={(e) => {
              setNewLenderData((prev) => ({ ...prev, address: e.target.value }))
            }}
          />

          <AddLenderSelect
            borrowerMarkets={borrowerMarkets}
            selectedMarkets={selectedMarkets}
            setSelectedMarkets={setSelectedMarkets}
          />
        </Box>

        <Button
          variant="contained"
          size="large"
          onClick={handleAddLender}
          disabled={disableButton}
          sx={{ margin: "0 24px" }}
        >
          Add
        </Button>
      </Dialog>
    </>
  )
}
