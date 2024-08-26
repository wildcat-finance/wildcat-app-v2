import { ChangeEvent, Dispatch, SetStateAction } from "react"

import {
  Box,
  IconButton,
  InputAdornment,
  SvgIcon,
  TextField,
} from "@mui/material"

import { EditLendersTable } from "@/app/[locale]/borrower/edit_lenders/components/EditLendersTable"
import { FilterLenderSelect } from "@/app/[locale]/borrower/edit_lenders/components/MarketSelect/FilterLenderSelect"
import { AddLenderModal } from "@/app/[locale]/borrower/edit_lenders/components/Modals/AddLender"
import { LenderTableT } from "@/app/[locale]/borrower/edit_lenders/interface"
import { MarketDataT } from "@/app/[locale]/borrower/edit_lenders/lendersMock"
import {
  FiltersContainer,
  SearchStyles,
} from "@/app/[locale]/borrower/edit_lenders/style"
import Cross from "@/assets/icons/cross_icon.svg"
import Search from "@/assets/icons/search_icon.svg"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setLenderFilter } from "@/store/slices/editLendersSlice/editLendersSlice"
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
  const dispatch = useAppDispatch()

  const selectedMarkets = useAppSelector(
    (state) => state.editLenders.marketFilter,
  )

  const lenderNameOrAddress = useAppSelector(
    (state) => state.editLenders.lenderFilter,
  )

  const handleChangeLender = (evt: ChangeEvent<HTMLInputElement>) => {
    dispatch(setLenderFilter(evt.target.value))
  }

  const handleClickEraseLender = (evt: React.MouseEvent) => {
    evt.stopPropagation()
    dispatch(setLenderFilter(""))
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
            value={lenderNameOrAddress}
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
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleClickEraseLender}
                    disableRipple
                    sx={{
                      padding: "0 2px 0 0",
                      "& path": {
                        fill: `${COLORS.greySuit}`,
                        transition: "fill 0.2s",
                      },
                      "& :hover": {
                        "& path": { fill: `${COLORS.santasGrey}` },
                      },
                    }}
                  >
                    <SvgIcon fontSize="small">
                      <Cross />
                    </SvgIcon>
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <FilterLenderSelect
            borrowerMarkets={borrowerMarkets ?? []}
            selectedMarkets={selectedMarkets}
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
