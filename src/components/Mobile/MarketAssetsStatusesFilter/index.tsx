import React from "react"

import { Box, Button, Divider, SvgIcon, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import Cross from "@/assets/icons/cross_icon.svg"
import Filter from "@/assets/icons/filter_icon.svg"
import { COLORS } from "@/theme/colors"

import { Filters } from "./Filter"
import { SmallFilterSelectItem } from "./types"

type MarketAssetsStatusesFilterProps = {
  assetsOptions: SmallFilterSelectItem[]
  selectedAssets: SmallFilterSelectItem[]
  setSelectedAssets: React.Dispatch<
    React.SetStateAction<SmallFilterSelectItem[]>
  >

  statusesOptions: SmallFilterSelectItem[]
  selectedStatuses: SmallFilterSelectItem[]
  setSelectedStatuses: React.Dispatch<
    React.SetStateAction<SmallFilterSelectItem[]>
  >

  onClear: () => void
  onApply: () => void
  onClose: () => void
}

export const MarketAssetsStatusesFilter = ({
  assetsOptions,
  selectedAssets,
  setSelectedAssets,
  statusesOptions,
  selectedStatuses,
  setSelectedStatuses,
  onClear,
  onApply,
  onClose,
}: MarketAssetsStatusesFilterProps) => {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        alignContent: "center",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "12px 12px 0",
          mb: "8px",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <SvgIcon
            fontSize="big"
            sx={{ "& path": { stroke: COLORS.greySuit } }}
          >
            <Filter />
          </SvgIcon>
          <Typography variant="text3" color={COLORS.greySuit}>
            {t("dashboard.filters.title")}
          </Typography>
        </Box>
        <SvgIcon
          sx={{ "& path": { stroke: COLORS.santasGrey } }}
          onClick={onClose}
        >
          <Cross />
        </SvgIcon>
      </Box>

      <Divider />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          px: "12px",
          mt: "6px",
        }}
      >
        <Filters
          assetsOptions={assetsOptions}
          selectedAssets={selectedAssets}
          setSelectedAssets={setSelectedAssets}
          statusesOptions={statusesOptions}
          selectedStatuses={selectedStatuses}
          setSelectedStatuses={setSelectedStatuses}
        />
      </Box>

      <Divider />

      <Box
        sx={{ display: "flex", justifyContent: "space-between", gap: "6px" }}
      >
        <Button
          size="small"
          variant="contained"
          color="secondary"
          sx={{ width: "100%", marginTop: "12px" }}
          onClick={onClear}
        >
          <Typography variant="text3">{t("common.actions.reset")}</Typography>
        </Button>
        <Button
          variant="contained"
          size="small"
          color="primary"
          sx={{ width: "100%", marginTop: "12px" }}
          onClick={onApply}
        >
          <Typography variant="text3" color={COLORS.white}>
            {t("common.actions.apply")}
          </Typography>
        </Button>
      </Box>
    </Box>
  )
}
