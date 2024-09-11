import * as React from "react"

import { Box, Button, IconButton, SvgIcon, Typography } from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"

import { MarketTableT } from "@/app/[locale]/borrower/edit-lenders/interface"
import { LenderName } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/components/LenderName"
import Cross from "@/assets/icons/cross_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { useAppDispatch } from "@/store/hooks"
import { resetEditLendersSlice } from "@/store/slices/editLendersSlice/editLendersSlice"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import { EditLendersTableProps } from "./interface"
import { AddedDot, EditLendersTableStyles, UndoButton } from "./style"
import { TableLenderSelect } from "../MarketSelect/TableLenderSelect"

export const EditLendersTable = ({
  lendersRows,
  setLendersRows,
  borrowerMarkets,
  hasFiltration,
}: EditLendersTableProps) => {
  const dispatch = useAppDispatch()

  const lendersName: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const handleResetFilters = () => {
    dispatch(resetEditLendersSlice())
  }

  const handleAddAllMarkets = (
    event: React.ChangeEvent<HTMLInputElement>,
    lenderAddress: string,
    existingMarkets: MarketTableT[],
  ) => {
    const isChecked = event.target.checked

    setLendersRows((prevLenders) =>
      prevLenders.map((lender) => {
        if (lender.address === lenderAddress) {
          const oldMarkets = existingMarkets
            .filter(
              (market) =>
                market.status === "old" || market.prevStatus === "old",
            )
            .map((market) =>
              market.prevStatus === "deleted"
                ? {
                    ...market,
                    status: "deleted" as const,
                    prevStatus: "old" as const,
                  }
                : market,
            )

          const restoredMarkets = existingMarkets.map((market) =>
            market.status === "deleted"
              ? {
                  ...market,
                  status: "old" as const,
                  prevStatus: "deleted" as const,
                }
              : market,
          )

          if (isChecked) {
            const newMarkets: MarketTableT[] = borrowerMarkets
              .filter(
                (market) =>
                  !existingMarkets.some(
                    (existing) => existing.address === market.address,
                  ),
              )
              .map((market) => ({
                name: market.name,
                address: market.address,
                status: "new",
                prevStatus: "new",
              }))

            return {
              ...lender,
              markets: [...restoredMarkets, ...newMarkets],
            }
          }

          if (oldMarkets.length === borrowerMarkets.length) {
            return {
              ...lender,
              markets: [],
            }
          }

          return {
            ...lender,
            markets: [...oldMarkets],
          }
        }
        return lender
      }),
    )
  }

  const columns: GridColDef[] = [
    {
      field: "name",
      disableColumnMenu: true,
      headerName: "Name",
      minWidth: 160,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <>
          {params.row.status === "deleted" && (
            <Typography
              color={COLORS.santasGrey}
              variant="text3"
              sx={{ textDecoration: "line-through" }}
            >
              {lendersName[params.row.address.toLowerCase()] ===
              ("" || undefined)
                ? "Add name"
                : lendersName[params.row.address.toLowerCase()]}
            </Typography>
          )}
          {params.row.status === "new" && (
            <>
              <Box
                sx={{ ...AddedDot, backgroundColor: COLORS.ultramarineBlue }}
              />
              <LenderName address={params.row.address} />
            </>
          )}
          {params.row.status === "old" && (
            <LenderName address={params.row.address} />
          )}
        </>
      ),
      flex: 1.5,
    },
    {
      field: "address",
      headerName: "Wallet Address",
      minWidth: 176,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Box display="flex" gap="4px">
          <Typography
            sx={{
              minWidth: "80px",
              textDecoration:
                params.row.status === "deleted" ? "line-through" : "",
              color: params.row.status === "deleted" ? COLORS.santasGrey : "",
            }}
            variant="text3"
          >
            {trimAddress(params.value)}
          </Typography>

          <LinkGroup
            linkValue={`${EtherscanBaseUrl}/address/${params.value}`}
            copyValue={params.value}
          />
        </Box>
      ),
      flex: 2,
    },
    {
      field: "assignedAll",
      disableColumnMenu: true,
      headerName: "Assigned to All",
      minWidth: 160,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <ExtendedCheckbox
          checked={params.row.markets.length === borrowerMarkets.length}
          onChange={(event) =>
            handleAddAllMarkets(event, params.row.address, params.row.markets)
          }
          disabled={params.row.status === "deleted"}
          sx={{
            "& ::before": {
              transform: "translate(-3px, -3px) scale(0.75)",
            },
          }}
        />
      ),
      flex: 1,
    },
    {
      sortable: true,
      field: "markets",
      headerName: "Assigned to Markets",
      minWidth: 250,
      maxWidth: 300,
      headerAlign: "left",
      align: "left",
      flex: 5,
      renderCell: (params) => (
        // eslint-disable-next-line react/jsx-no-useless-fragment
        <>
          {!(params.row.status === "deleted") && (
            <TableLenderSelect
              lenderMarkets={params.value}
              lenderAddress={params.row.address}
              borrowerMarkets={borrowerMarkets}
              setLendersRows={setLendersRows}
              handleAddAllMarkets={handleAddAllMarkets}
              disabled={params.row.status === "deleted"}
            />
          )}
        </>
      ),
    },
    {
      sortable: false,
      field: "",
      align: "right",
      flex: 0.0001,
      renderCell: (params) => (
        <>
          {(params.row.status === "old" || params.row.status === "new") && (
            <IconButton
              sx={{ marginRight: "5px" }}
              onClick={() => {
                if (params.row.status === "new") {
                  setLendersRows((prev) =>
                    prev.filter((item) => item.address !== params.row.address),
                  )
                } else if (params.row.status === "old") {
                  setLendersRows((prev) =>
                    prev.map((item) => {
                      if (item.address === params.row.address) {
                        return {
                          ...item,
                          prevStatus: item.status,
                          status: "deleted",
                        }
                      }
                      return item
                    }),
                  )
                }
              }}
            >
              <SvgIcon
                fontSize="small"
                sx={{
                  "& path": { fill: `${COLORS.greySuit}` },
                }}
              >
                <Cross />
              </SvgIcon>
            </IconButton>
          )}
          {params.row.status === "deleted" && (
            <Button
              sx={UndoButton}
              variant="text"
              onClick={() => {
                setLendersRows((prev) =>
                  prev.map((item) => {
                    if (item.address === params.row.address) {
                      return {
                        ...item,
                        status: item.prevStatus || "old",
                      }
                    }
                    return item
                  }),
                )
              }}
            >
              Undo
            </Button>
          )}
        </>
      ),
    },
  ]

  return (
    <>
      {lendersRows.length > 0 && (
        <DataGrid
          sx={EditLendersTableStyles}
          getRowHeight={() => "auto"}
          rows={lendersRows}
          columns={columns}
        />
      )}

      {lendersRows.length === 0 && (
        <Box sx={{ height: "100%", display: "flex" }}>
          <Box
            sx={{
              height: "100%",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
          >
            <Typography variant="text3" color={COLORS.santasGrey}>
              {hasFiltration ? "No lenders for this filters" : "No lenders yet"}
            </Typography>
            {hasFiltration && (
              <Button
                onClick={handleResetFilters}
                size="small"
                variant="text"
                sx={{
                  color: COLORS.ultramarineBlue,
                  "&:hover": {
                    color: COLORS.ultramarineBlue,
                  },
                }}
              >
                Reset filters
              </Button>
            )}
          </Box>
        </Box>
      )}
    </>
  )
}
