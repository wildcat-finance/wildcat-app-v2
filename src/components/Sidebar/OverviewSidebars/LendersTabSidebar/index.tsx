import { ChangeEvent, useEffect, useState } from "react"

import { Box, Button, InputAdornment, SvgIcon, TextField } from "@mui/material"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useGetAllLenders } from "@/app/[locale]/borrower/hooks/useGetAllLenders"
import Icon from "@/assets/icons/search_icon.svg"
import { FilterSelect } from "@/components/FilterSelect"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  setLendersFilter,
  setMarketsFilter,
  setSearchFilter,
} from "@/store/slices/borrowerLendersTabSidebarSlice/borrowerLendersTabSidebarSlice"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

export const LendersTabSidebar = () => {
  const dispatch = useAppDispatch()

  const selectedLendersStore = useAppSelector(
    (state) => state.borrowerLendersTabSidebar.lenderFilter,
  )
  const selectedMarketsStore = useAppSelector(
    (state) => state.borrowerLendersTabSidebar.marketFilter,
  )
  const searchStore = useAppSelector(
    (state) => state.borrowerLendersTabSidebar.searchFilter,
  )

  const handleChangeSearch = (evt: ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchFilter(evt.target.value))
  }

  const lendersNames: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const { data: borrowerMarkets } = useGetBorrowerMarkets()
  const activeBorrowerMarkets = borrowerMarkets
    ?.filter((market) => !market.isClosed)
    .map((market) => ({ name: market.name, address: market.address }))

  const { data: lenders } = useGetAllLenders()
  const lendersData = lenders?.addresses.map((address) => {
    const lender = lenders?.lenders[address]
    return {
      name: lendersNames[lender?.lender] ?? trimAddress(lender?.lender),
      address: lender.lender,
    }
  })

  const [selectedMarkets, setSelectedMarkets] = useState<
    { name: string; address: string }[]
  >([])

  const [selectedLenders, setSelectedLenders] = useState<
    { name: string; address: string }[]
  >([])

  const handleClickReset = () => {
    setSelectedMarkets([])
    setSelectedLenders([])
    dispatch(setSearchFilter(""))
  }

  useEffect(() => {
    dispatch(setMarketsFilter(selectedMarkets))
    dispatch(setLendersFilter(selectedLenders))
  }, [selectedMarkets, selectedLenders])

  return (
    <Box
      sx={{
        height: "100%",
        width: "267px",
        borderRight: `1px solid ${COLORS.blackRock006}`,
        padding: "42px 16px 0px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <TextField
        value={searchStore}
        onChange={handleChangeSearch}
        fullWidth
        placeholder="Search"
        size="small"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SvgIcon
                fontSize="small"
                sx={{ "& path": { fill: `${COLORS.greySuit}` } }}
              >
                <Icon />
              </SvgIcon>
            </InputAdornment>
          ),
        }}
      />

      <FilterSelect
        label="Markets"
        placeholder="Filter by Markets"
        selected={selectedMarketsStore}
        setSelected={setSelectedMarkets}
        options={activeBorrowerMarkets ?? []}
      />

      <FilterSelect
        label="Lenders"
        placeholder="Filter by Lenders"
        selected={selectedLendersStore}
        setSelected={setSelectedLenders}
        options={lendersData ?? []}
      />

      <Button
        onClick={handleClickReset}
        variant="contained"
        color="secondary"
        size="medium"
        sx={{ height: "32px", padding: "11px" }}
      >
        Reset all filters
      </Button>
    </Box>
  )
}
