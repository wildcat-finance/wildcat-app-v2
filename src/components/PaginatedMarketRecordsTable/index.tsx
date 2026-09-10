import { Dispatch, SetStateAction, useEffect, useState } from "react"
import * as React from "react"

import {
  Box,
  Button,
  FormControlLabel,
  Popover,
  SvgIcon,
  Typography,
} from "@mui/material"
import { Market, MarketRecordKind } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { useBorrowerNameOrAddress } from "@/app/[locale]/borrower/hooks/useBorrowerNames"
import Filter from "@/assets/icons/filter_icon.svg"
import { FilterTextField } from "@/components/FilterTextfield"
import { getMarketAprCopy } from "@/components/market-implementation-variants"
import { MobileMarketRecordItem } from "@/components/Mobile/MobileMarketRecordItem"
import { SeeMoreButton } from "@/components/Mobile/SeeMoreButton"
import { toastError } from "@/components/Toasts"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useMarketDetailPerformanceMark } from "@/hooks/useMarketDetailPerformance"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import { buildMarketRecordsCsv } from "@/utils/marketRecords"

import {
  ALL_MARKET_RECORD_KINDS,
  DEFAULT_MARKET_RECORDS_PAGE_SIZE,
  MARKET_RECORD_FILTERS,
  MarketRecordFilterOption,
} from "./constants"
import {
  fetchAllMarketRecords,
  filterMarketRecords,
  useMarketRecords,
} from "./hooks/useMarketRecords"
import { MarketRecordsTable } from "./MarketRecordsTable"
import ExtendedCheckbox from "../@extended/ExtendedСheckbox"

export function PaginatedMarketRecordsTable({
  market,
  setIsOpen,
}: {
  market: Market
  setIsOpen?: Dispatch<SetStateAction<boolean>>
}) {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()
  const { getTxUrl } = useBlockExplorer({ chainId: market.chainId })
  const borrowerName = useBorrowerNameOrAddress(market.borrower)
  const { aprRecordName } = getMarketAprCopy(market)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_MARKET_RECORDS_PAGE_SIZE)
  const [selectedFilters, setSelectedFilters] = useState<MarketRecordKind[]>(
    ALL_MARKET_RECORD_KINDS,
  )
  const [search, setSearch] = useState("")
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    setPageSize(isMobile ? 6 : 10)
  }, [isMobile])

  useEffect(() => {
    setPage(0)
  }, [selectedFilters])

  useEffect(() => {
    setPage(0)
  }, [search])

  const { data, isLoading } = useMarketRecords({
    market,
    page,
    pageSize,
    kinds: selectedFilters as MarketRecordKind[],
    search,
  })
  useMarketDetailPerformanceMark(
    "history-first-row-ready",
    {
      address: market.address,
      chainId: market.chainId,
    },
    !isLoading && Boolean(data?.records?.length),
  )
  const visibleRecordRange = data?.records.length
    ? {
        from: page * pageSize + 1,
        to: page * pageSize + data.records.length,
      }
    : undefined
  const options = MARKET_RECORD_FILTERS

  const handleChange = (o: MarketRecordFilterOption, checked: boolean) => {
    const otherSelectedFilters = selectedFilters.filter((f) => f !== o.value)

    if (checked) {
      setSelectedFilters([...otherSelectedFilters, o.value])
    } else {
      setSelectedFilters(otherSelectedFilters)
    }
  }

  const handleClear = () => {
    setSelectedFilters(ALL_MARKET_RECORD_KINDS)
  }

  const handleToggleAll = (checked: boolean) => {
    setSelectedFilters(checked ? ALL_MARKET_RECORD_KINDS : [])
  }

  const allSelected = selectedFilters.length === ALL_MARKET_RECORD_KINDS.length
  const isIndeterminate =
    selectedFilters.length > 0 &&
    selectedFilters.length < ALL_MARKET_RECORD_KINDS.length

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const records = filterMarketRecords({
        records: await fetchAllMarketRecords({ market }),
        kinds: selectedFilters,
        search,
      })
      let lenderNames: { [key: string]: string } = {}
      try {
        lenderNames = JSON.parse(
          window.localStorage.getItem("lenders-name") || "{}",
        )
      } catch {
        lenderNames = {}
      }

      const csv = buildMarketRecordsCsv(
        records,
        lenderNames,
        borrowerName,
        aprRecordName,
      )
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      )
      const link = document.createElement("a")
      link.href = url
      link.download = `wildcat-market-${market.address}-history.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      toastError(t("marketDetails.shared.records.exportFailed"))
    } finally {
      setIsExporting(false)
    }
  }

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const open = Boolean(anchorEl)
  const id = open ? "filters-popover" : undefined

  const filterButton = (
    <Box
      sx={{
        position: "relative",
        display: "inline-flex",
        marginRight: isMobile ? 0 : "6px",
      }}
    >
      <Button
        aria-describedby={id}
        variant="text"
        color="secondary"
        size="small"
        sx={{
          gap: "6px",
          padding: "6px",
          minWidth: "fit-content",
          color: isIndeterminate ? COLORS.ultramarineBlue : COLORS.bunker,
          backgroundColor: isIndeterminate ? "#E4EBFEB2" : COLORS.whiteSmoke,
          "&:hover": {
            color: isIndeterminate ? COLORS.ultramarineBlue : COLORS.bunker,
            backgroundColor: isIndeterminate
              ? "rgba(228,235,254,0.5)"
              : COLORS.athensGrey,
          },
        }}
        onClick={handleClick}
      >
        <SvgIcon
          fontSize="big"
          sx={{
            "& path": {
              stroke: isIndeterminate ? COLORS.ultramarineBlue : COLORS.bunker,
              transition: "stroke 0.2s",
            },
          }}
        >
          <Filter />
        </SvgIcon>
      </Button>

      {isIndeterminate && (
        <Box
          sx={{
            position: "absolute",
            top: "-2px",
            right: "-2px",
            width: "7.5px",
            height: "7.5px",
            borderRadius: "50%",
            border: "1px solid white",
            backgroundColor: COLORS.ultramarineBlue,
          }}
        />
      )}
    </Box>
  )

  const exportButton = (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant="outlined"
      color="secondary"
      size="small"
      sx={{ minWidth: "fit-content", whiteSpace: "nowrap" }}
    >
      {t(
        isExporting
          ? "marketDetails.shared.records.exporting"
          : "marketDetails.shared.records.exportCsv",
      )}
    </Button>
  )

  if (isMobile && setIsOpen) {
    const lendersName: { [key: string]: string } = JSON.parse(
      localStorage.getItem("lenders-name") || "{}",
    )
    const previewRecords = data?.records?.slice(0, 3)

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          backgroundColor: COLORS.white,
          borderRadius: "14px",
          padding: "12px 16px",
        }}
      >
        <Typography variant="mobH3" marginTop="12px">
          {t("marketDetails.shared.sidebar.marketHistory")}
        </Typography>

        <Box sx={{ marginTop: "8px" }}>
          {isLoading ? (
            <Box display="flex" flexDirection="column" rowGap="8px">
              {[0, 1, 2].map((i) => (
                <Box
                  key={i}
                  sx={{
                    height: "60px",
                    width: "100%",
                    backgroundColor: COLORS.athensGrey,
                    borderRadius: "8px",
                  }}
                />
              ))}
            </Box>
          ) : (
            previewRecords?.map((r, index) => (
              <MobileMarketRecordItem
                key={r.transactionHash + r.eventIndex}
                record={r}
                lenderNames={lendersName}
                borrowerName={borrowerName}
                txUrl={getTxUrl(r.transactionHash)}
                aprName={aprRecordName}
                isLast={index === (previewRecords?.length ?? 0) - 1}
              />
            ))
          )}
        </Box>

        {(data?.records?.length ?? 0) > 0 && (
          <SeeMoreButton
            variant="modal"
            setIsOpen={setIsOpen}
            sx={{ marginTop: "16px" }}
          />
        )}
      </Box>
    )
  }

  if (isMobile) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          width: "100%",
          padding: "12px 16px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {filterButton}

          <Box sx={{ flex: 1 }}>
            <FilterTextField
              value={search}
              setValue={setSearch}
              placeholder={t("marketDetails.shared.records.searchId")}
              width="100%"
            />
          </Box>

          {exportButton}
        </Box>

        <Popover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          sx={{
            "& .MuiPaper-root": {
              width: "294px",
              height: "fit-content",
              fontFamily: "inherit",
              padding: "12px",
              marginTop: "2px",
            },
          }}
        >
          <Box sx={{ padding: "6px 0 6px 10px" }}>
            <FormControlLabel
              label={t("marketDetails.shared.records.allTypes")}
              control={
                <ExtendedCheckbox
                  checked={allSelected}
                  indeterminate={isIndeterminate}
                  onChange={(event) => handleToggleAll(event.target.checked)}
                  sx={{
                    "& ::before": {
                      transform: "translate(-3px, -3px) scale(0.75)",
                    },
                  }}
                />
              }
            />
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              padding: "0 10px 0 26px",
            }}
          >
            {options.map((o) => (
              <Box
                key={o.id}
                sx={{ padding: "2px 0", display: "flex", align: "center" }}
              >
                <FormControlLabel
                  label={o.label}
                  control={
                    <ExtendedCheckbox
                      value={o.value}
                      onChange={(event) =>
                        handleChange(o, event.target.checked)
                      }
                      checked={selectedFilters.includes(o.value)}
                      sx={{
                        "& ::before": {
                          transform: "translate(-3px, -3px) scale(0.75)",
                        },
                      }}
                    />
                  }
                />
              </Box>
            ))}
          </Box>

          <Button
            onClick={handleClear}
            size="medium"
            variant="contained"
            color="secondary"
            sx={{ width: "100%", marginTop: "12px" }}
          >
            {t("common.buttons.reset")}
          </Button>
        </Popover>

        <MarketRecordsTable
          market={market}
          records={data?.records}
          isLoading={isLoading}
          page={page}
          setPage={setPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          rowCount={data?.totalRecords}
        />
      </Box>
    )
  }

  return (
    <>
      {filterButton}

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        sx={{
          "& .MuiPaper-root": {
            width: "294px",
            height: "fit-content",
            fontFamily: "inherit",
            padding: "12px",
            marginTop: "2px",
          },
        }}
      >
        <Box sx={{ padding: "6px 0 6px 10px" }}>
          <FormControlLabel
            label={t("marketDetails.shared.records.allTypes")}
            control={
              <ExtendedCheckbox
                checked={allSelected}
                indeterminate={isIndeterminate}
                onChange={(event) => handleToggleAll(event.target.checked)}
                sx={{
                  "& ::before": {
                    transform: "translate(-3px, -3px) scale(0.75)",
                  },
                }}
              />
            }
          />
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            padding: "0 10px 0 26px",
          }}
        >
          {options.map((o) => (
            <Box
              key={o.id}
              sx={{ padding: "2px 0", display: "flex", align: "center" }}
            >
              <FormControlLabel
                label={o.label}
                control={
                  <ExtendedCheckbox
                    value={o.value}
                    onChange={(event) => handleChange(o, event.target.checked)}
                    checked={selectedFilters.includes(o.value)}
                    sx={{
                      "& ::before": {
                        transform: "translate(-3px, -3px) scale(0.75)",
                      },
                    }}
                  />
                }
              />
            </Box>
          ))}
        </Box>

        <Button
          onClick={handleClear}
          size="medium"
          variant="contained"
          color="secondary"
          sx={{ width: "100%", marginTop: "12px" }}
        >
          {t("common.buttons.reset")}
        </Button>
      </Popover>

      <FilterTextField
        value={search}
        setValue={setSearch}
        placeholder={t("marketDetails.shared.records.searchId")}
        width="180px"
      />

      {exportButton}

      <MarketRecordsTable
        market={market}
        records={data?.records}
        isLoading={isLoading}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        rowCount={data?.totalRecords}
      />

      {visibleRecordRange && (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Typography variant="text3">
            {t("marketDetails.shared.records.paginationRange", {
              from: visibleRecordRange.from,
              to: visibleRecordRange.to,
            })}
          </Typography>
        </Box>
      )}
    </>
  )
}
