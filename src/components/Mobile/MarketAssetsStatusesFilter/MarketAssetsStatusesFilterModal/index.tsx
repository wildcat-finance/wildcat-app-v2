import React, { useState } from "react"

import { Box, Dialog, DialogContent, SvgIcon } from "@mui/material"

import Filter from "@/assets/icons/filter_icon.svg"
import { COLORS } from "@/theme/colors"

import { MarketAssetsStatusesFilter } from ".."
import { SmallFilterSelectItem } from "../types"

export const MarketAssetsStatusesFilterModal = () => {
  const [open, setOpen] = useState(false)

  const assetsOptions = [
    { id: "market", name: "Market" },
    { id: "healthy", name: "Healthy" },
    { id: "pending", name: "Pending" },
    { id: "penalty", name: "Penalty" },
  ]
  const statusesOptions = [
    { id: "currency", name: "Currency" },
    { id: "eug", name: "EUG" },
    { id: "weth", name: "WETH" },
    { id: "uni", name: "UNI" },
  ]
  const [selectedAssets, setSelectedAssets] = useState<SmallFilterSelectItem[]>(
    [],
  )
  const [selectedStatuses, setSelectedStatuses] = useState<
    SmallFilterSelectItem[]
  >([])

  const handleClear = () => {
    setSelectedAssets([])
    setSelectedStatuses([])
  }

  const handleApply = () => {
    setOpen(false)
  }

  const handleClose = () => {
    setOpen(false)
  }
  const isFilled = selectedAssets.length > 0 || selectedStatuses.length > 0

  return (
    <>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          backgroundColor: isFilled ? COLORS.glitter : COLORS.blackHaze,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={() => setOpen(true)}
      >
        <SvgIcon fontSize="big" sx={{ "& path": { stroke: COLORS.greySuit } }}>
          <Filter />
        </SvgIcon>
      </Box>

      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "14px",
          },
        }}
      >
        <DialogContent sx={{ padding: 0 }}>
          <MarketAssetsStatusesFilter
            assetsOptions={assetsOptions}
            selectedAssets={selectedAssets}
            setSelectedAssets={setSelectedAssets}
            statusesOptions={statusesOptions}
            selectedStatuses={selectedStatuses}
            setSelectedStatuses={setSelectedStatuses}
            onClear={handleClear}
            onApply={handleApply}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
