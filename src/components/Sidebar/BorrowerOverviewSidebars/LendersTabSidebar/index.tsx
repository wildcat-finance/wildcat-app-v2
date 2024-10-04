import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react"

import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  Select,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material"

import { useGetBorrowerMarkets } from "@/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets"
import { useGetAllLenders } from "@/app/[locale]/borrower/hooks/useGetAllLenders"
import Filter from "@/assets/icons/filter_icon.svg"
import Icon from "@/assets/icons/search_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  setLendersFilter,
  setMarketsFilter,
  setSearchFilter,
} from "@/store/slices/borrowerLendersTabSidebarSlice/borrowerLendersTabSidebarSlice"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

const FilterSelect = ({
  label,
  placeholder,
  selected,
  setSelected,
  options,
}: {
  label: string
  placeholder: string
  selected: { name: string; address: string }[]
  setSelected: Dispatch<SetStateAction<{ name: string; address: string }[]>>
  options: { name: string; address: string }[]
}) => {
  const selectRef = useRef<HTMLElement>(null)

  const onOpen = () => {
    if (selectRef.current) {
      selectRef.current.classList.add("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.add("Mui-focused")
    }
  }

  const onClose = () => {
    if (selectRef.current) {
      selectRef.current.classList.remove("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.remove("Mui-focused")
    }
  }

  const handleChangeItems = (
    event: React.ChangeEvent<HTMLInputElement>,
    item: { name: string; address: string },
  ) => {
    if (event.target.checked) {
      setSelected([...selected, item])
    } else {
      setSelected(
        selected.filter(
          (existingItem) => existingItem.address !== item.address,
        ),
      )
    }
  }

  const handleDeleteItem = (item: { name: string; address: string }) => {
    setSelected(
      selected.filter((existingItem) => existingItem.address !== item.address),
    )
  }

  const handleClear = () => {
    setSelected([])
  }

  const [name, setName] = useState("")

  const handleChangeName = (evt: ChangeEvent<HTMLInputElement>) => {
    setName(evt.target.value)
  }

  const filteredOptions = options.filter((option) => option.name.includes(name))

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        alignItems: "flex-start",
        marginBottom: "20px",
      }}
    >
      <Box
        sx={{ display: "flex", width: "100%", justifyContent: "space-between" }}
      >
        <Typography variant="text3" color={COLORS.santasGrey}>
          {label}
        </Typography>

        {selected.length !== 0 && (
          <Button
            onClick={handleClear}
            variant="text"
            size="small"
            sx={{
              color: COLORS.ultramarineBlue,
              padding: 0,
              minWidth: "min-content",
              "&:hover": {
                backgroundColor: "transparent",
                color: COLORS.cornflowerBlue,
              },
            }}
          >
            Clear
          </Button>
        )}
      </Box>

      <FormControl sx={{ width: "100%" }}>
        <InputLabel
          sx={{
            fontSize: "13px",
            fontWeight: 500,
            lineHeight: "20px",
            color: COLORS.santasGrey,
            transform: "translate(33px, 6px)",
            pointerEvents: "none",

            "&.MuiInputLabel-shrink": {
              display: "block",

              "&.Mui-focused": {
                transform: "translate(33px, 6px)",
              },
            },
          }}
        >
          {placeholder}
        </InputLabel>

        <Select
          ref={selectRef}
          onOpen={onOpen}
          onClose={onClose}
          value={selected}
          size="small"
          multiple
          startAdornment={
            <SvgIcon
              fontSize="big"
              sx={{
                "& path": { stroke: `${COLORS.greySuit}` },
              }}
            >
              <Filter />
            </SvgIcon>
          }
          renderValue={() => null}
          MenuProps={{
            sx: {
              "& .MuiPaper-root": {
                fontFamily: "inherit",
                padding: "16px 20px 20px",
                marginTop: "2px",
              },
            },
          }}
          sx={{
            width: "100%",
            height: "32px",
            "& .MuiSelect-icon": {
              display: "block",
              top: "5px",
              transform: "translate(3.5px, 0px) scale(0.7)",
              "&.MuiSelect-iconOpen": {
                transform: "translate(3.5px, 0px) scale(0.7) rotate(180deg)",
              },

              "& path": { fill: `${COLORS.santasGrey}` },
            },
          }}
        >
          <TextField
            value={name}
            onChange={handleChangeName}
            fullWidth
            size="small"
            placeholder="Search by Name"
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
                    <Icon />
                  </SvgIcon>
                </InputAdornment>
              ),
            }}
          />

          <Box
            sx={{
              height: "132px",
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginTop: "20px",
              padding: "0px 10px",
            }}
          >
            {filteredOptions.map((item) => (
              <FormControlLabel
                key={item.address}
                label={item.name}
                sx={{
                  "& .MuiTypography-root": {
                    maxWidth: "145px",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    overflowX: "hidden",
                  },
                }}
                control={
                  <ExtendedCheckbox
                    value={item}
                    onChange={(event) => handleChangeItems(event, item)}
                    checked={selected.some(
                      (selectedItem) => selectedItem.address === item.address,
                    )}
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
        </Select>
      </FormControl>

      {selected.length !== 0 && (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexWrap: "wrap",
            gap: "4px 4px",
          }}
        >
          {selected.map((item) => (
            <LendersMarketChip
              marketName={item.name}
              width={item.name.length > 27 ? "100%" : "fit-content"}
              withButton
              onClick={() => handleDeleteItem(item)}
              type="new"
            />
          ))}
        </Box>
      )}
    </Box>
  )
}

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

  const { data: borrowerMarkets, isLoading: isMarketsLoading } =
    useGetBorrowerMarkets()
  const activeBorrowerMarkets = borrowerMarkets
    ?.filter((market) => !market.isClosed)
    .map((market) => ({ name: market.name, address: market.address }))

  const { data: lenders, isLoading: isLendersLoading } = useGetAllLenders()
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
        sx={{
          marginBottom: "16px",
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
