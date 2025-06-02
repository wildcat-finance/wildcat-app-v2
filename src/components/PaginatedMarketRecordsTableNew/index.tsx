import { useEffect, useState } from "react"

import { Box, Button, Typography } from "@mui/material"
import { Market, MarketRecordKind } from "@wildcatfi/wildcat-sdk"

import { COLORS } from "@/theme/colors"

import { FilterTextField } from "../FilterTextfield"
import { useMarketRecords } from "../PaginatedMarketRecordsTable/hooks/useMarketRecords"
import { MarketRecordsTable } from "../PaginatedMarketRecordsTable/MarketRecordsTable"
import { SmallFilterSelect, SmallFilterSelectItem } from "../SmallFilterSelect"

const MarketRecordFilters: SmallFilterSelectItem[] = (
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
).map(([id, name]) => ({ id, name }))

export function PaginatedMarketRecordsTableNew({ market }: { market: Market }) {
  const [marketSearch, setMarketSearch] = useState<string>("")
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedFilters, setSelectedFilters] =
    useState<SmallFilterSelectItem[]>(MarketRecordFilters)

  useEffect(() => {
    setPage(0)
  }, [selectedFilters])

  const { data, isLoading } = useMarketRecords({
    market,
    page,
    pageSize,
    kinds: selectedFilters.map((item) => item.id as MarketRecordKind),
  })

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mt: "10px",
          mb: "24px",
        }}
      >
        <Typography variant="title3" sx={{ color: COLORS.blackRock }}>
          Market History
        </Typography>
        <Button variant="outlined" size="small" color="secondary">
          Download
        </Button>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: "6px",
          flexDirection: "row",
          justifyContent: "flex-start",
          alignItems: "center",
          mb: "16px",
        }}
      >
        <FilterTextField
          value={marketSearch}
          setValue={setMarketSearch}
          placeholder="Search by Name"
        />
        <SmallFilterSelect
          placeholder="Filter by Type"
          options={MarketRecordFilters}
          selected={selectedFilters}
          setSelected={setSelectedFilters}
          withSearch={false}
          showResultsbutton
        />
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
    </Box>
  )
}
