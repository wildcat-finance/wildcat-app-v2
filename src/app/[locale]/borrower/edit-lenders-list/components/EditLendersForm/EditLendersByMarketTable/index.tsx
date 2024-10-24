import * as React from "react"
import { useState } from "react"

import { Box, Button, IconButton, SvgIcon, Typography } from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { useTranslation } from "react-i18next"

import { DeleteModal } from "@/app/[locale]/borrower/edit-lenders-list/components/EditLendersForm/Modals/DeleteModal"
import { EditLenderFlowStatuses } from "@/app/[locale]/borrower/edit-lenders-list/interface"
import { LenderName } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/components/LenderName"
import Cross from "@/assets/icons/cross_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  resetFilters,
  setLendersTableData,
} from "@/store/slices/editLendersListSlice/editLendersListSlice"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type EditLendersByMarketTableModel = {
  id: string
  name: string
  address: string
  delete: string
}

export const EditLendersByMarketTable = () => {
  const { t } = useTranslation()
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false)
  const [lenderToDelete, setLenderToDelete] = useState<string>("")

  const dispatch = useAppDispatch()

  const lendersTableData = useAppSelector(
    (state) => state.editLendersList.lendersTableData,
  )

  const lenderNameOrAddress = useAppSelector(
    (state) => state.editLendersList.lenderFilter,
  )

  const selectedMarket = useAppSelector(
    (state) => state.editLendersList.marketFilter,
  )

  const lendersNames: { [key: string]: string } = JSON.parse(
    localStorage.getItem("lenders-name") || "{}",
  )

  const filteredLenders = lendersTableData
    .filter(
      (lender) =>
        (lendersNames[lender.address.toLowerCase()] || lender.address)
          .toLowerCase()
          .includes(lenderNameOrAddress.toLowerCase()) ||
        lender.address
          .toLowerCase()
          .includes(lenderNameOrAddress.toLowerCase()),
    )
    .filter((lender) =>
      lender.markets.some(
        (market) => market.address === selectedMarket.address,
      ),
    )
    .map((lender) => {
      const chosenMarket = lender.markets.find(
        (market) => market.address === selectedMarket.address,
      )

      return {
        status: chosenMarket ? chosenMarket.status : "",
        id: lender.address,
        address: lender.address,
        lenderStatus: lender.status,
        lenderMarketsAmount: lender.markets.filter(
          (m) => m.status !== EditLenderFlowStatuses.DELETED,
        ).length,
      }
    })

  const noLenders = filteredLenders.length === 0

  const handleClickDelete = (
    lenderAddress: string,
    lenderStatus: EditLenderFlowStatuses,
    lenderMarketsAmount: number,
    marketStatus: EditLenderFlowStatuses,
  ) => {
    if (marketStatus === EditLenderFlowStatuses.NEW) {
      if (
        lenderStatus === EditLenderFlowStatuses.NEW &&
        lenderMarketsAmount === 1
      ) {
        setLenderToDelete(lenderAddress)
        setIsDeleteModalOpen(true)
      } else {
        dispatch(
          setLendersTableData(
            lendersTableData.map((lender) =>
              lender.address === lenderAddress
                ? {
                    ...lender,
                    markets: lender.markets.filter(
                      (market) => market.address !== selectedMarket.address,
                    ),
                  }
                : lender,
            ),
          ),
        )
      }
    } else {
      dispatch(
        setLendersTableData(
          lendersTableData.map((lender) =>
            lender.address === lenderAddress
              ? {
                  ...lender,
                  status:
                    lenderMarketsAmount === 1
                      ? EditLenderFlowStatuses.DELETED
                      : EditLenderFlowStatuses.OLD,
                  markets: [
                    ...lender.markets.filter(
                      (m) => m.address !== selectedMarket.address,
                    ),
                    {
                      ...selectedMarket,
                      status: EditLenderFlowStatuses.DELETED,
                    },
                  ],
                }
              : lender,
          ),
        ),
      )
    }
  }

  const handleClickUndo = (lenderAddress: string) => {
    dispatch(
      setLendersTableData(
        lendersTableData.map((lender) =>
          lender.address === lenderAddress
            ? {
                ...lender,
                status: EditLenderFlowStatuses.OLD,
                markets: [
                  ...lender.markets.filter(
                    (m) => m.address !== selectedMarket.address,
                  ),
                  {
                    ...selectedMarket,
                    status: EditLenderFlowStatuses.OLD,
                  },
                ],
              }
            : lender,
        ),
      ),
    )
  }

  const columns: TypeSafeColDef<EditLendersByMarketTableModel>[] = [
    {
      field: "name",
      headerName: "Name",
      disableColumnMenu: true,
      minWidth: 170,
      maxWidth: 190,
      flex: 1,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <>
          {params.row.status === EditLenderFlowStatuses.DELETED && (
            <Typography
              color={COLORS.santasGrey}
              variant="text3"
              sx={{ textDecoration: "line-through" }}
            >
              {lendersNames[params.row.address.toLowerCase()] ===
              ("" || undefined)
                ? "Add name"
                : lendersNames[params.row.address.toLowerCase()]}
            </Typography>
          )}
          {params.row.status === EditLenderFlowStatuses.NEW && (
            <>
              <Box
                sx={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  marginRight: "4px",
                  backgroundColor: COLORS.ultramarineBlue,
                }}
              />
              <LenderName address={params.row.address} />
            </>
          )}
          {params.row.status === EditLenderFlowStatuses.OLD && (
            <LenderName address={params.row.address} />
          )}
        </>
      ),
    },
    {
      field: "address",
      headerName: "Wallet Address",
      disableColumnMenu: true,
      minWidth: 180,
      maxWidth: 200,
      flex: 1,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Box display="flex" gap="4px">
          <Typography
            sx={{
              minWidth: "80px",
              textDecoration:
                params.row.status === EditLenderFlowStatuses.DELETED
                  ? "line-through"
                  : "",
              color:
                params.row.status === EditLenderFlowStatuses.DELETED
                  ? COLORS.santasGrey
                  : "",
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
    },
    {
      field: "delete",
      headerName: "",
      disableColumnMenu: true,
      flex: 0.0001,
      align: "right",
      renderCell: (params) => (
        <>
          {(params.row.status === EditLenderFlowStatuses.OLD ||
            params.row.status === EditLenderFlowStatuses.NEW) && (
            <IconButton
              sx={{ marginRight: "5px" }}
              onClick={() =>
                handleClickDelete(
                  params.row.address,
                  params.row.lenderStatus,
                  params.row.lenderMarketsAmount,
                  params.row.status,
                )
              }
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
          {params.row.status === EditLenderFlowStatuses.DELETED && (
            <Button
              onClick={() => handleClickUndo(params.row.address)}
              sx={{
                minWidth: "36px",
                padding: 0,
                marginRight: "5px",
                color: COLORS.ultramarineBlue,
              }}
              variant="text"
            >
              {t("editLendersList.forms.edit.undo")}
            </Button>
          )}
        </>
      ),
    },
  ]

  return (
    <>
      {!noLenders && (
        <DataGrid
          columns={columns}
          rows={filteredLenders}
          sx={{
            "& .MuiDataGrid-cell": {
              minHeight: "52px",
              height: "auto",
              padding: "12px 8px",
              cursor: "default",
            },

            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "transparent",
              padding: "0 8px",
            },
          }}
          disableColumnSorting
        />
      )}

      {noLenders && (
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
              {t("editLendersList.forms.edit.noLendersFilter")}
            </Typography>
            <Button
              onClick={() => dispatch(resetFilters())}
              size="small"
              variant="text"
              sx={{
                color: COLORS.ultramarineBlue,
                "&:hover": {
                  color: COLORS.ultramarineBlue,
                },
              }}
            >
              {t("editLendersList.forms.edit.resetFilters")}
            </Button>
          </Box>
        </Box>
      )}

      <DeleteModal
        isOpen={isDeleteModalOpen}
        setIsOpen={setIsDeleteModalOpen}
        lenderAddress={lenderToDelete}
      />
    </>
  )
}
