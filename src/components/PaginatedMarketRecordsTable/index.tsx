import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react"
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
import { MobileMarketRecordItem } from "@/components/Mobile/MobileMarketRecordItem"
import { SeeMoreButton } from "@/components/Mobile/SeeMoreButton"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS, TOKENS } from "@/theme/colors"

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
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedFilters, setSelectedFilters] = useState<MarketRecordKind[]>(
    MarketRecordFilters.map((f) => f.value),
  )
  const [search, setSearch] = useState("")

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
          backgroundColor: isIndeterminate
            ? TOKENS.brandPrimarySubtle
            : COLORS.whiteSmoke,
          "&:hover": {
            color: isIndeterminate ? COLORS.ultramarineBlue : COLORS.bunker,
            backgroundColor: isIndeterminate
              ? TOKENS.brandPrimarySubtle
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
          {t("lenderMarketDetails.sidebar.marketHistory")}
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
              placeholder="Search by ID"
              width="100%"
            />
          </Box>
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
            Reset
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
