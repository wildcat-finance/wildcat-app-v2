import React, { useState } from "react"

import { Box, Button, Dialog, Typography, TextField } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useMarketsForBorrower } from "@/app/[locale]/borrower/hooks/useMarketsForBorrower"
import { TxModalDialog } from "@/app/[locale]/borrower/market/[address]/components/Modals/style"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"

import { AddLenderModalProps } from "./interface"
import { ContentContainer } from "./style"
import { MarketSelect } from "../MarketSelect"

export const AddLenderModal = ({
  setRows,
  setLendersName,
}: AddLenderModalProps) => {
  const { t } = useTranslation()
  const { data: allMarkets, isLoading } = useMarketsForBorrower()

  const { address, isConnected } = useAccount()
  const [isOpen, setIsOpen] = useState(false)

  const [newLenderData, setNewLenderData] = useState<{
    name: string
    address: string
  }>({
    name: "",
    address: "",
  })

  const activeBorrowerMarketsNames = allMarkets
    ?.filter(
      (market) =>
        market.borrower.toLowerCase() === address?.toLowerCase() &&
        !market.isClosed,
    )
    .map((market) => market.name)

  const [chosenMarkets, setChosenMarkets] = useState<string[]>([])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setChosenMarkets((prevItems) => [...prevItems, event.target.value])
    } else {
      setChosenMarkets((prevItems) =>
        prevItems.filter((selectedItem) => selectedItem !== event.target.value),
      )
    }
  }

  const handleDeleteMarket = (marketToDelete: string) => {
    setChosenMarkets((prevMarkets) =>
      prevMarkets.filter((market) => market !== marketToDelete),
    )
  }

  const handleReset = () => {
    setChosenMarkets([])
  }
  return (
    <>
      <Button
        size="small"
        variant="contained"
        sx={{ width: "98px", justifyContent: "space-between" }}
        onClick={() => {
          setIsOpen(true)
        }}
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

      <Dialog open={isOpen} sx={TxModalDialog}>
        <TxModalHeader
          title="Add a new lender"
          crossOnClick={null}
          arrowOnClick={() => {
            setIsOpen(false)
          }}
        />

        <Box sx={ContentContainer}>
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
          <MarketSelect
            chosenMarkets={chosenMarkets}
            borrowerMarkets={activeBorrowerMarketsNames || []}
            handleChange={handleChange}
            handleDelete={handleDeleteMarket}
            handleReset={handleReset}
          />
        </Box>

        <TxModalFooter
          mainBtnText="Add"
          disableMainBtn={
            newLenderData.name === "" ||
            !newLenderData.address.startsWith("0x") ||
            newLenderData.address.length !== 42
          }
          mainBtnOnClick={() => {
            setRows((prev) => [
              ...prev,
              {
                id: newLenderData.address,
                isAuth: false,
                name: {
                  name: newLenderData.name,
                  address: newLenderData.address,
                },
                address: newLenderData.address,
                markets: chosenMarkets.map((item) => ({
                  marketName: item,
                  address: "",
                })),
                status: "new",
              },
            ])
            setLendersName((prev) => {
              if (newLenderData.name === "") {
                delete prev[newLenderData.address.toLowerCase()]
              } else {
                prev[newLenderData.address.toLowerCase()] = newLenderData.name
                localStorage.setItem("lenders-name", JSON.stringify(prev))
              }
              return prev
            })

            setIsOpen(false)
          }}
        />
      </Dialog>
    </>
  )
}
