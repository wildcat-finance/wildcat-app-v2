import * as React from "react"
import { useState } from "react"

import {
  Box,
  Dialog,
  Divider,
  IconButton,
  MenuItem,
  SvgIcon,
  Typography,
} from "@mui/material"
import { MarketCollateralV1 } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import Cross from "@/assets/icons/cross_icon.svg"
import DownArrow from "@/assets/icons/downArrow_icon.svg"
import Filter from "@/assets/icons/filter_icon.svg"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

export type MobileCollateralSelectProps = {
  collateralContracts: MarketCollateralV1[] | undefined
  selectedContract: MarketCollateralV1 | undefined
  setSelectedContract: React.Dispatch<
    React.SetStateAction<MarketCollateralV1 | undefined>
  >
}

export const MobileCollateralSelect = ({
  collateralContracts,
  selectedContract,
  setSelectedContract,
}: MobileCollateralSelectProps) => {
  const [open, setOpen] = useState<boolean>(false)

  const handleToggleOpen = () => setOpen((prev) => !prev)

  const handleChangeContract = (contractAddress: string) => {
    const newSelectedContract = collateralContracts?.find(
      (contract) =>
        contract.address.toLowerCase() === contractAddress.toLowerCase(),
    )

    setSelectedContract(newSelectedContract)
    handleToggleOpen()
  }

  if (!collateralContracts) return null

  return (
    <>
      <Box
        onClick={handleToggleOpen}
        sx={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 8px 6px 12px",
          borderRadius: "8px",
          bgcolor: COLORS.blackHaze,
        }}
      >
        <Typography variant="mobText2">
          {selectedContract ? selectedContract.collateralAsset.name : ""}
        </Typography>

        <SvgIcon
          sx={{ fontSize: "18px", "& path": { fill: COLORS.santasGrey } }}
        >
          <DownArrow />
        </SvgIcon>
      </Box>

      <Dialog
        open={open}
        onClose={handleToggleOpen}
        sx={{
          backdropFilter: "blur(10px)",
          "& .MuiDialog-paper": {
            height: "fit-content",
            width: "100%",
            maxWidth: "100%",
            border: "none",
            borderRadius: "14px",
            padding: "12px 0px",
            margin: "auto 4px 4px",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 12px",
            marginBottom: "8px",
          }}
        >
          <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <SvgIcon
              sx={{ fontSize: "20px", "& path": { fill: COLORS.santasGrey } }}
            >
              <Filter />
            </SvgIcon>

            <Typography variant="mobText3" color={COLORS.santasGrey}>
              Collateral Contract
            </Typography>
          </Box>

          <IconButton
            onClick={handleToggleOpen}
            sx={{ width: "16px", height: "16px" }}
          >
            <SvgIcon
              sx={{ fontSize: "16px", "& path": { fill: COLORS.santasGrey } }}
            >
              <Cross />
            </SvgIcon>
          </IconButton>
        </Box>

        <Divider />

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "auto",
            margin: "16px 0",
            padding: "0px 8px",
          }}
        >
          {collateralContracts.map((contract) => (
            <MenuItem
              onClick={() => handleChangeContract(contract.address)}
              key={contract.address}
              value={contract.address}
              sx={{
                minHeight: "fit-content",
                padding: "6px 12px",
                borderRadius: "8px",
              }}
            >
              <Typography variant="text3">
                {contract.collateralAsset.name}
              </Typography>
            </MenuItem>
          ))}
        </Box>
      </Dialog>
    </>
  )
}
