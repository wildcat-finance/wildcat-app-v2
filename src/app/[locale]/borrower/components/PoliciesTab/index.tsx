import React, { ChangeEvent, useRef, useState } from "react"

import {
  Box,
  IconButton,
  InputAdornment,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material"
import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid"
import { HooksKind, Market } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { LinkCell } from "@/app/[locale]/borrower/components/MarketsTables/style"
import {
  PolicyFilterSelect,
  PolicyFilterSelectItem,
} from "@/app/[locale]/borrower/components/PoliciesTab/components/PolicyFilterSelect"
import { useGetBorrowerHooksDataWithSubgraph } from "@/app/[locale]/borrower/hooks/useGetBorrowerHooksData"
import Cross from "@/assets/icons/cross_icon.svg"
import Search from "@/assets/icons/search_icon.svg"
import { ROUTES } from "@/routes"
import { setLenderFilter } from "@/store/slices/editLendersListSlice/editLendersListSlice"
import { COLORS } from "@/theme/colors"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type PolicyDataT = {
  id: string
  name: string
  type: string
  accessRequirements: string
  markets: number
}

export type PoliciesTabProps = {
  markets: Market[] | undefined
  isMarketsLoading: boolean
}

export const PoliciesTab = ({
  markets,
  isMarketsLoading,
}: PoliciesTabProps) => {
  const { t } = useTranslation()

  const [policyName, setPolicyName] = useState<string>("")

  const editPolicyLink = (policy: string) =>
    `${ROUTES.borrower.policy}?policy=${encodeURIComponent(policy)}`

  const { data: hooksData, isLoading } = useGetBorrowerHooksDataWithSubgraph()

  const rows: GridRowsProp<PolicyDataT> = [
    ...(hooksData?.hooksInstances.map((policy) => ({
      id: policy.address,
      name: policy.name || "Unnamed Policy",
      type: policy.kind,
      markets: policy.numMarkets || 0,
      accessRequirements:
        policy.roleProviders.length === 1 ? "Manual Approval" : "Self-Onboard",
    })) ?? []),
    ...(hooksData?.controller
      ? [
          {
            id: hooksData.controller.address,
            name: "V1 Markets",
            type: HooksKind.OpenTerm,
            // markets: hooksData.controller.markets.map((market) => market.name),
            markets: hooksData.controller.numMarkets,
            accessRequirements: "Manual Approval",
          },
        ]
      : []),
  ].filter((policy) => policy.name.includes(policyName))

  const columns: TypeSafeColDef<PolicyDataT>[] = [
    {
      field: "name",
      headerName: "Policy Name",
      flex: 1.5,
      minWidth: 160,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Link
          href={editPolicyLink(params.row.id)}
          style={{ ...LinkCell, justifyContent: "flex-start" }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {params.value}
          </span>
        </Link>
      ),
    },
    {
      field: "type",
      headerName: "Type",
      flex: 1.5,
      minWidth: 160,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Link
          href={editPolicyLink(params.row.id)}
          style={{ ...LinkCell, justifyContent: "flex-start" }}
        >
          <Typography variant="text3">
            {params.row.type === HooksKind.OpenTerm
              ? "Standard Loan"
              : "Fixed Loan"}
          </Typography>
        </Link>
      ),
    },
    {
      field: "accessRequirements",
      headerName: "Access Requirements",
      flex: 1.5,
      minWidth: 160,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Link
          href={editPolicyLink(params.row.id)}
          style={{ ...LinkCell, justifyContent: "flex-start" }}
        >
          <Box width={130}>{params.value}</Box>
        </Link>
      ),
    },
    {
      field: "markets",
      headerName: "Assigned to Markets",
      minWidth: 500,
      flex: 4,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Link
          href={editPolicyLink(params.row.id)}
          style={{ ...LinkCell, justifyContent: "flex-start" }}
        >
          <Box width={130}>{params.value}</Box>
        </Link>
      ),
    },
  ]

  const handleChangePolicy = (evt: ChangeEvent<HTMLInputElement>) => {
    setPolicyName(evt.target.value)
  }

  const handleClickErase = (evt: React.MouseEvent) => {
    evt.stopPropagation()
    setLenderFilter("")
  }

  const marketsOptions = markets?.map((market) => ({
    id: market.address,
    name: market.name,
  }))

  const [marketsFilter, setMarketsFilter] = useState<PolicyFilterSelectItem[]>(
    [],
  )

  return (
    <Box sx={{ width: "100%" }}>
      {/* <Box */}
      {/*  sx={{ */}
      {/*    width: "100%", */}
      {/*    display: "flex", */}
      {/*    justifyContent: "space-between", */}
      {/*    alignItems: "center", */}
      {/*  }} */}
      {/* > */}
      {/*  <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}> */}
      {/*    <Typography variant="title2">Policies</Typography> */}
      {/*    <Typography variant="text3" color={COLORS.santasGrey}> */}
      {/*      Common agreement for several markets.{" "} */}
      {/*      <Link */}
      {/*        href="https://docs.wildcat.finance/" */}
      {/*        style={{ color: COLORS.santasGrey }} */}
      {/*      > */}
      {/*        Learn more */}
      {/*      </Link> */}
      {/*    </Typography> */}
      {/*  </Box> */}

      {/*  <Link href={ROUTES.borrower.createMarket}> */}
      {/*    <Button */}
      {/*      variant="contained" */}
      {/*      size="small" */}
      {/*      sx={{ */}
      {/*        paddingTop: "8px", */}
      {/*        paddingBottom: "8px", */}
      {/*        minWidth: "100px", */}
      {/*      }} */}
      {/*    > */}
      {/*      {t("borrowerMarketList.button.newPolicy")} */}
      {/*    </Button> */}
      {/*  </Link> */}
      {/* </Box> */}

      <Box
        sx={{
          width: "100%",
          padding: "0 24px",
          margin: "0 0 24px 0",
          display: "flex",
          gap: "6px",
        }}
      >
        <TextField
          value={policyName}
          onChange={handleChangePolicy}
          size="small"
          placeholder="Search"
          sx={{
            width: "180px",

            "& .MuiInputBase-root": {
              paddingRight: "8px",
            },
          }}
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
            endAdornment: policyName ? (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleClickErase}
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
            ) : null,
          }}
        />

        <PolicyFilterSelect
          placeholder="Markets"
          options={marketsOptions ?? []}
          selected={marketsFilter}
          setSelected={setMarketsFilter}
        />
      </Box>

      <Box>
        <Box
          sx={{
            width: "100%",
            padding: "6px 16px",
            backgroundColor: COLORS.hintOfRed,
          }}
        >
          <Box display="flex" columnGap="4px">
            <Typography variant="text3">Policies</Typography>
            <Typography variant="text3" color={COLORS.santasGrey}>
              {isLoading ? "Are Loading..." : rows.length}
            </Typography>
          </Box>
        </Box>

        {rows.length !== 0 && !isLoading && (
          <DataGrid
            sx={{
              overflow: "auto",
              maxWidth: "calc(100vw - 267px)",

              "& .MuiDataGrid-cell": {
                minHeight: "52px",
                height: "auto",
                cursor: "default",
              },
            }}
            rows={rows}
            columns={columns}
            columnHeaderHeight={40}
            getRowHeight={() => "auto"}
          />
        )}
      </Box>
    </Box>
  )
}
