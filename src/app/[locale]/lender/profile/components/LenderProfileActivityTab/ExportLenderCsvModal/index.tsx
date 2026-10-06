"use client"

import * as React from "react"
import { ChangeEvent, useRef, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  ListItemText,
  MenuItem,
  Select,
  SvgIcon,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material"
import type { Dayjs } from "dayjs"

import type { LenderPositionRow } from "@/app/[locale]/lender/profile/hooks/types"
import { useLenderExportData } from "@/app/[locale]/lender/profile/hooks/useLenderExportData"
import Cross from "@/assets/icons/cross_icon.svg"
import SearchIcon from "@/assets/icons/search_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { DateRange } from "@/components/DateRange"
import { COLORS } from "@/theme/colors"
import {
  buildExportFilename,
  buildLenderCsv,
  LenderExportFilters,
  LenderExportPositionSnapshot,
  triggerCsvDownload,
} from "@/utils/lenderCsvExport"

type ExportLenderCsvModalProps = {
  open: boolean
  onClose: () => void
  lenderAddress: `0x${string}`
  positions: LenderPositionRow[]
}

type DateRangeState = {
  starting: Dayjs | null
  ending: Dayjs | null
}

const toPositionSnapshot = (
  position: LenderPositionRow,
): LenderExportPositionSnapshot => ({
  marketId: position.marketId,
  marketName: position.marketName,
  borrowerAddress: position.borrower,
  assetSymbol: position.asset,
  assetDecimals: position.assetDecimals,
  interestEarnedNative: position.interestEarnedNative,
})

const DialogPaperSx = {
  "& .MuiDialog-paper": {
    width: "582px",
    maxWidth: "calc(100vw - 32px)",
    borderRadius: "20px",
    margin: 0,
    padding: "24px 20px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
}

const HeaderTextContainerSx = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
}

const buildMarketsMenuPropsSx = (width: number | null) => ({
  "& .MuiPaper-root": {
    maxHeight: "320px",
    padding: "8px",
    ...(width !== null && {
      width: `${width}px !important`,
      minWidth: `${width}px !important`,
      maxWidth: `${width}px !important`,
    }),
  },
})

const MarketsSearchSx = {
  marginBottom: "8px",
  "& .MuiInputBase-root": {
    borderRadius: "8px",
  },
}

export const ExportLenderCsvModal = ({
  open,
  onClose,
  lenderAddress,
  positions,
}: ExportLenderCsvModalProps) => {
  const [period, setPeriod] = React.useState<"all" | "range">("all")
  const [dates, setDates] = React.useState<DateRangeState>({
    starting: null,
    ending: null,
  })
  const [selectedMarketIds, setSelectedMarketIds] = React.useState<string[]>([])
  const [marketSearch, setMarketSearch] = useState("")
  const [menuWidth, setMenuWidth] = useState<number | null>(null)
  const [localError, setLocalError] = React.useState<string | null>(null)

  const selectRef = useRef<HTMLDivElement>(null)

  const marketIds = positions.map((position) => position.marketId)
  const exportMutation = useLenderExportData({
    lenderAddress,
    marketIds,
  })

  const handleClose = () => {
    onClose()
    setPeriod("all")
    setDates({ starting: null, ending: null })
    setSelectedMarketIds([])
    setMarketSearch("")
    setLocalError(null)
  }

  const handlePeriodChange = (
    _event: React.SyntheticEvent,
    next: "all" | "range",
  ) => {
    setPeriod(next)
    if (next === "all") {
      setDates({ starting: null, ending: null })
    }
  }

  const handleSelectOpen = () => {
    setMarketSearch("")
    if (selectRef.current) {
      setMenuWidth(selectRef.current.getBoundingClientRect().width)
      selectRef.current.classList.add("Mui-focused")
    }
  }

  const handleSelectClose = () => {
    if (selectRef.current) {
      selectRef.current.classList.remove("Mui-focused")
    }
  }

  const handleMarketSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMarketSearch(event.target.value)
  }

  const handleChangeItems = (
    event: ChangeEvent<HTMLInputElement>,
    item: LenderPositionRow,
  ) => {
    setSelectedMarketIds((previous) =>
      event.target.checked
        ? [...previous, item.marketId]
        : previous.filter((id) => id !== item.marketId),
    )
  }

  const filteredPositions = positions.filter((position) =>
    position.marketName.toLowerCase().includes(marketSearch.toLowerCase()),
  )

  const handleClear = () => {
    setSelectedMarketIds([])
    setMarketSearch("")
  }

  const handleDownload = async () => {
    setLocalError(null)

    const filters: LenderExportFilters = {
      fromTimestamp:
        period === "range"
          ? dates.starting?.startOf("day").unix() ?? null
          : null,
      toTimestamp:
        period === "range" ? dates.ending?.endOf("day").unix() ?? null : null,
      marketIds: selectedMarketIds.length > 0 ? selectedMarketIds : null,
    }

    try {
      const events = await exportMutation.mutateAsync()
      const csv = buildLenderCsv(
        events,
        positions.map(toPositionSnapshot),
        filters,
        Math.floor(Date.now() / 1000),
      )
      const filename = buildExportFilename(lenderAddress, filters)
      triggerCsvDownload(csv, filename)
      handleClose()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to export CSV"
      setLocalError(message)
    }
  }

  const downloadLabel = exportMutation.isPending ? "Preparing…" : "Download"
  const downloadDisabled = exportMutation.isPending || positions.length === 0

  return (
    <Dialog open={open} onClose={handleClose} sx={DialogPaperSx}>
      <Box>
        <Box sx={HeaderTextContainerSx}>
          <Typography variant="title3">Market events</Typography>
          <IconButton disableRipple onClick={handleClose} aria-label="Close">
            <SvgIcon fontSize="big">
              <Cross />
            </SvgIcon>
          </IconButton>
        </Box>
        <Typography variant="text3" sx={{ color: COLORS.santasGrey }}>
          Generate and download a summary of your deposits, withdrawals and
          interest earned.
        </Typography>
      </Box>

      <Tabs
        sx={{ width: "100%", height: "40px" }}
        variant="fullWidth"
        value={period}
        onChange={handlePeriodChange}
        className="contained"
      >
        <Tab value="all" label="All time" className="contained" />
        <Tab value="range" label="Custom range" className="contained" />
      </Tabs>

      {period === "range" && (
        <Box>
          <DateRange dates={dates} setDates={setDates} />
        </Box>
      )}

      <FormControl fullWidth>
        <Select
          ref={selectRef}
          multiple
          displayEmpty
          value={selectedMarketIds}
          onOpen={handleSelectOpen}
          onClose={handleSelectClose}
          onChange={(event) =>
            setSelectedMarketIds(
              typeof event.target.value === "string"
                ? [event.target.value]
                : (event.target.value as string[]),
            )
          }
          renderValue={(selected) =>
            (selected as string[]).length === 0
              ? "All markets"
              : `${(selected as string[]).length} market(s)`
          }
          MenuProps={{ sx: buildMarketsMenuPropsSx(menuWidth) }}
          sx={{
            "& .MuiSelect-icon": {
              "& path": { fill: `${COLORS.santasGrey}` },
            },
          }}
        >
          <Box onKeyDown={(event) => event.stopPropagation()}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name"
              value={marketSearch}
              onChange={handleMarketSearchChange}
              sx={MarketsSearchSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SvgIcon
                      fontSize="small"
                      sx={{ "& path": { fill: COLORS.greySuit } }}
                    >
                      <SearchIcon />
                    </SvgIcon>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box
            sx={{
              maxHeight: "150px",
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginTop: "10px",
              padding: "0 10px",
            }}
          >
            {filteredPositions.length === 0 && (
              <MenuItem disabled>
                <ListItemText primary="No matching markets" />
              </MenuItem>
            )}

            {filteredPositions.map((item) => (
              <FormControlLabel
                key={item.id}
                label={item.marketName}
                sx={{
                  "& .MuiTypography-root": {
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    overflowX: "hidden",
                  },
                }}
                control={
                  <ExtendedCheckbox
                    value={item}
                    onChange={(event) => handleChangeItems(event, item)}
                    checked={selectedMarketIds.includes(item.marketId)}
                    sx={{
                      "& ::before": {
                        transform: "translate(-3px, -3px) scale(0.75)",
                      },
                    }}
                  />
                }
              />
            ))}
          </Box>

          <Box
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            sx={{ marginTop: "10px" }}
          >
            <Button
              onClick={(event) => {
                event.stopPropagation()
                handleClear()
              }}
              size="small"
              variant="contained"
              color="secondary"
              fullWidth
            >
              Reset
            </Button>
          </Box>
        </Select>
      </FormControl>

      {period === "range" && (
        <Typography
          variant="text4"
          sx={{ color: COLORS.santasGrey, padding: "0 4px" }}
        >
          Interest is reported as a lifetime per-market total and is not
          affected by the date filter.
        </Typography>
      )}

      {localError !== null && (
        <Typography
          variant="text4"
          sx={{ color: COLORS.dullRed, padding: "0 4px" }}
        >
          {localError}
        </Typography>
      )}

      <Button
        variant="contained"
        size="large"
        onClick={handleDownload}
        disabled={downloadDisabled}
        fullWidth
      >
        {downloadLabel}
      </Button>
    </Dialog>
  )
}
