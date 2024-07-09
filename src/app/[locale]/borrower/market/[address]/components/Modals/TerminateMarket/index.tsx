import React, { useState } from "react"

import { Button } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { TerminateModalV1Flow } from "@/app/[locale]/borrower/market/[address]/components/Modals/TerminateModalV1Flow"
import Cross from "@/assets/icons/cross_icon.svg"

export const TerminateMarket = ({
  marketAccount,
}: {
  marketAccount: MarketAccount
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenModal = () => {
    setIsOpen(true)
  }

  return (
    <>
      <Button
        variant="outlined"
        color="secondary"
        sx={{ fontWeight: 500, marginTop: "24px", width: "100%" }}
        onClick={handleOpenModal}
      >
        <SvgIcon fontSize="small" sx={{ marginRight: "4px" }}>
          <Cross />
        </SvgIcon>
        Terminate Market
      </Button>

      <TerminateModalV1Flow
        marketAccount={marketAccount}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    </>
  )
}
