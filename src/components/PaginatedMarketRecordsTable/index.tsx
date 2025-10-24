import { useEffect, useMemo, useState } from "react"
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

import Filter from "@/assets/icons/filter_icon.svg"
import { FilterTextField } from "@/components/FilterTextfield"
import { COLORS } from "@/theme/colors"

import { useMarketRecords } from "./hooks/useMarketRecords"
import { MarketRecordsTable } from "./MarketRecordsTable"
import ExtendedCheckbox from "../@extended/ExtendedСheckbox"

type CheckboxOption<T> = {
  id: string
  value: T
  label: string
}

const MarketRecordFilters: CheckboxOption<MarketRecordKind>[] = (
  [
    ["AnnualInterestBipsUpdated", "APR Change"],
    ["Borrow", "Borrow"],
    ["DebtRepaid", "Repayment"],
    ["DelinquencyStatusChanged", "Delinquency"],
    ["Deposit", "Deposit"],
    ["FeesCollected", "Fees"],
    ["FixedTermUpdated", "Fixed Term"],
    ["MarketClosed", "Market Closed"],
    ["MaxTotalSupplyUpdated", "Capacity Change"],
    ["MinimumDepositUpdated", "Minimum Deposit Updated"],
    ["ProtocolFeeBipsUpdated", "Protocol Fee Change"],
    ["WithdrawalRequest", "Withdrawal"],
  ] as [MarketRecordKind, string][]
).map(([value, label]) => ({ id: `check-filter-${value}`, value, label }))

const ALL_KINDS: MarketRecordKind[] = MarketRecordFilters.map((f) => f.value)

export function PaginatedMarketRecordsTable({ market }: { market: Market }) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedFilters, setSelectedFilters] = useState<MarketRecordKind[]>(
    MarketRecordFilters.map((f) => f.value),
  )
  const [search, setSearch] = useState("")

  useEffect(() => {
    setPage(0)
  }, [selectedFilters])

  useEffect(() => {
    setPage(0)
  }, [search])

  const { data, isLoading, pagesCount, finalEventIndex } = useMarketRecords({
    market,
    page,
    pageSize,
    kinds: selectedFilters as MarketRecordKind[],
    search,
  })
  const options = MarketRecordFilters

  const handleChange = (
    o: CheckboxOption<MarketRecordKind>,
    checked: boolean,
  ) => {
    const otherSelectedFilters = selectedFilters.filter((f) => f !== o.value)

    if (checked) {
      setSelectedFilters([...otherSelectedFilters, o.value])
    } else {
      setSelectedFilters(otherSelectedFilters)
    }
  }

  const handleClear = () => {
    setSelectedFilters(ALL_KINDS)
  }

  const handleToggleAll = (checked: boolean) => {
    setSelectedFilters(checked ? ALL_KINDS : [])
  }

  const allSelected = selectedFilters.length === ALL_KINDS.length
  const isIndeterminate =
    selectedFilters.length > 0 && selectedFilters.length < ALL_KINDS.length

  const [startEventIndex, endEventIndex] = useMemo(() => {
    if (!data?.records.length || data.totalRecords === undefined) {
      return [undefined, undefined]
    }

    const start = page * pageSize + 1
    const end = Math.min(start + data.records.length - 1, data.totalRecords)

    return [start, end]
  }, [data, page, pageSize])

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const open = Boolean(anchorEl)
  const id = open ? "filters-popover" : undefined

  return (
    <>
      <Box
        sx={{
          position: "relative",
          display: "inline-flex",
          marginRight: "6px",
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
                stroke: isIndeterminate
                  ? COLORS.ultramarineBlue
                  : COLORS.bunker,
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
            label="All types"
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
            <Box sx={{ padding: "2px 0", display: "flex", align: "center" }}>
              <FormControlLabel
                key={o.id}
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
          Reset
        </Button>
      </Popover>

      <FilterTextField
        value={search}
        setValue={setSearch}
        placeholder="Search by ID"
        width="180px"
      />

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

      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {startEventIndex !== undefined && (
          <Typography variant="text3">
            Viewing records {startEventIndex} to {endEventIndex}
          </Typography>
        )}
        {/*      <div className="flex gap-x-4 items-center flex-row">
          {page > 0 && (
            // <ExpandMore
            //   className="transform rotate-90 hover:rotate-90 page-btn-left hover:scale-150"
            //   onClick={() => setPage(page - 1)}
            // />
          )}
          Page {page + 1} {pagesCount === undefined ? "" : `of ${pagesCount}`}
          {pagesCount && pagesCount - 1 > page && data?.length === pageSize && (
            <ExpandMore
              className="transform -rotate-90 hover:-rotate-90 page-btn-left hover:scale-150"
              onClick={() => setPage(page + 1)}
            />
          )}
        </div> */}
      </Box>
    </>
  )
}
