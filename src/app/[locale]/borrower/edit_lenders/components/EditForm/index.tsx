import { ChangeEvent, Dispatch, SetStateAction, useState } from "react"

import { Box, InputAdornment, SvgIcon, TextField } from "@mui/material"

import { EditLendersTable } from "@/app/[locale]/borrower/edit_lenders/components/EditLendersTable"
import { FilterLenderSelect } from "@/app/[locale]/borrower/edit_lenders/components/MarketSelect/FilterLenderSelect"
import { AddLenderModal } from "@/app/[locale]/borrower/edit_lenders/components/Modals/AddLender"
import { LenderTableT } from "@/app/[locale]/borrower/edit_lenders/interface"
import { MarketDataT } from "@/app/[locale]/borrower/edit_lenders/lendersMock"
import {
  FiltersContainer,
  SearchStyles,
} from "@/app/[locale]/borrower/edit_lenders/style"
import Search from "@/assets/icons/search_icon.svg"
import { COLORS } from "@/theme/colors"

export type EditLendersFormProps = {
  lendersRows: LenderTableT[]
  setLendersRows: Dispatch<SetStateAction<LenderTableT[]>>
  setLendersNames: Dispatch<SetStateAction<{ [p: string]: string }>>
  borrowerMarkets: MarketDataT[]
}

export const EditLendersForm = ({
  lendersRows,
  setLendersRows,
  setLendersNames,
  borrowerMarkets,
}: EditLendersFormProps) => {
  const [selectedMarkets, setSelectedMarkets] = useState<MarketDataT[]>([])

  const [lenderNameOrAddress, setLenderNameOrAddress] = useState("")

  const handleChangeLender = (evt: ChangeEvent<HTMLInputElement>) => {
    setLenderNameOrAddress(evt.target.value)
  }

  const filteredLenders = lendersRows.filter((lender) => {
    const matchesAllMarkets =
      selectedMarkets.length === 0 ||
      selectedMarkets.every((selectedMarket) =>
        lender.markets.some(
          (lenderMarket) => lenderMarket.address === selectedMarket.address,
        ),
      )

    const matchesSearchTerm =
      lenderNameOrAddress === "" ||
      lender.name.name
        .toLowerCase()
        .includes(lenderNameOrAddress.toLowerCase()) ||
      lender.address.toLowerCase().includes(lenderNameOrAddress.toLowerCase())

    return matchesAllMarkets && matchesSearchTerm
  })

  return (
    <>
      <Box sx={FiltersContainer}>
        <Box display="flex" gap="4px">
          <TextField
            onChange={handleChangeLender}
            size="small"
            placeholder="Search"
            sx={SearchStyles}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SvgIcon
                    fontSize="small"
                    sx={{
                      width: "20px",
                      "& path": { fill: `${COLORS.greySuit}` },
                    }}
                  >
                    <Search />
                  </SvgIcon>
                </InputAdornment>
              ),
            }}
          />

          <FilterLenderSelect
            borrowerMarkets={borrowerMarkets ?? []}
            selectedMarkets={selectedMarkets}
            setSelectedMarkets={setSelectedMarkets}
          />
        </Box>

        <AddLenderModal
          setLendersRows={setLendersRows}
          setLendersNames={setLendersNames}
          borrowerMarkets={borrowerMarkets ?? []}
        />
      </Box>

      <EditLendersTable
        lendersRows={filteredLenders}
        setLendersRows={setLendersRows}
        setLendersNames={setLendersNames}
        borrowerMarkets={borrowerMarkets ?? []}
      />
    </>
  )
}
