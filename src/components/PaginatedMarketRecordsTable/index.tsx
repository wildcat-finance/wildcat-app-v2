import { useEffect, useMemo, useState } from "react"

import { Box, FormControlLabel } from "@mui/material"
import { Market, MarketRecordKind } from "@wildcatfi/wildcat-sdk"

import { useMarketRecords } from "./hooks/useMarketRecords"
import { MarketRecordsTable } from "./MarketRecordsTable"
import ExtendedCheckbox from "../@extended/ExtendedСheckbox"
import { TablePagination } from "../TablePagination"

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

export function PaginatedMarketRecordsTable({ market }: { market: Market }) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedFilters, setSelectedFilters] = useState<MarketRecordKind[]>(
    MarketRecordFilters.map((f) => f.value),
  )

  useEffect(() => {
    setPage(0)
  }, [selectedFilters])

  const { data, isLoading, pagesCount, finalEventIndex } = useMarketRecords({
    market,
    page,
    pageSize,
    kinds: selectedFilters as MarketRecordKind[],
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

  const [startEventIndex, endEventIndex] = useMemo(() => {
    if (
      finalEventIndex === undefined ||
      data === undefined ||
      data.records.length === 0
    ) {
      return [undefined, undefined]
    }
    return [
      finalEventIndex - data.records[0].eventIndex,
      finalEventIndex - data.records[data.records.length - 1].eventIndex,
    ]
  }, [data, finalEventIndex])

  console.log("DEBUG page", {
    page,
    data,
    pageSize,
    pagesCount,
    rowCount: finalEventIndex,
  })

  return (
    <>
      {/* <CheckboxGrid
        onChange={handleChange}
        selected={selectedFilters}
        options={options}
      /> */}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)", // 4 columns
          gridTemplateRows: "repeat(3, auto)", // 3 rows
          gap: "10px",
          marginTop: "10px",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {options.map((o) => (
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
        ))}
      </Box>
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

      <div className="h-9 flex justify-between items-center bg-tint-9 px-6">
        {startEventIndex !== undefined && (
          <div className="inline text-black text-xs font-bold">
            Viewing records {startEventIndex} to {endEventIndex}
          </div>
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
      </div>
    </>
  )
}
