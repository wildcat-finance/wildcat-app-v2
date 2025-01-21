import React, { ChangeEvent, useRef, useState } from "react"

import {
  Box,
  Button,
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
import { useGetBorrowerHooksDataWithSubgraph } from "@/app/[locale]/borrower/hooks/useGetBorrowerHooksData"
import Cross from "@/assets/icons/cross_icon.svg"
import Search from "@/assets/icons/search_icon.svg"
import { FilterTextField } from "@/components/FilterTextfield"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { ROUTES } from "@/routes"
import { setLenderFilter } from "@/store/slices/editLendersListSlice/editLendersListSlice"
import { COLORS } from "@/theme/colors"

import {
  SmallFilterSelect,
  SmallFilterSelectItem,
} from "../../../../../components/SmallFilterSelect"

export type TypeSafeColDef<T> = GridColDef & { field: keyof T }

export type PolicyDataT = {
  id: string
  name: string
  type: string
  accessRequirements: string
  markets: { name: string; address: string }[]
}

export type PoliciesTabProps = {
  markets: Market[] | undefined
  isMarketsLoading: boolean
}

export const PoliciesSection = ({
  markets,
  isMarketsLoading,
}: PoliciesTabProps) => {
  const { t } = useTranslation()

  const [policyName, setPolicyName] = useState<string>("")

  const [marketsFilter, setMarketsFilter] = useState<SmallFilterSelectItem[]>(
    [],
  )

  const editPolicyLink = (policy: string) =>
    `${ROUTES.borrower.policy}?policy=${encodeURIComponent(policy)}`

  const { data: hooksData, isLoading } = useGetBorrowerHooksDataWithSubgraph()

  const policies: GridRowsProp<PolicyDataT> = [
    ...(hooksData?.hooksInstances.map((policy) => ({
      id: policy.address,
      name: policy.name || "Unnamed Policy",
      type: policy.kind,
      markets: markets
        ? markets
            .filter(
              (market) => market.hooksConfig?.hooksAddress === policy.address,
            )
            .map((market) => ({ name: market.name, address: market.address }))
        : [],
      accessRequirements:
        policy.roleProviders.length === 1 ? "Manual Approval" : "Self-Onboard",
    })) ?? []),
    ...(hooksData?.controller
      ? [
          {
            id: hooksData.controller.address,
            name: "V1 Markets",
            type: HooksKind.OpenTerm,
            markets: markets
              ? markets.filter(
                  (market) => market.hooksConfig?.hooksAddress === undefined,
                )
              : [],
            accessRequirements: "Manual Approval",
          },
        ]
      : []),
  ].filter((policy) => policy.name.includes(policyName))

  const rows: GridRowsProp<PolicyDataT> = policies
    .filter((policy) => policy.name.includes(policyName))
    .filter(
      (policy) =>
        marketsFilter.length === 0 ||
        policy.markets.some((market) =>
          marketsFilter.some((filter) => filter.id === market.address),
        ),
    )

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
      sortable: true,
      field: "markets",
      headerName: "Assigned to Markets",
      minWidth: 176,
      headerAlign: "left",
      align: "left",
      flex: 4,
      renderCell: (params) => (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
            padding: "14px 0",
          }}
        >
          {params.value.map((market: { name: string; address: string }) => (
            <LendersMarketChip
              marketName={market.name}
              key={market.address}
              width="fit-content"
            />
          ))}
        </Box>
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

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 24px",
          marginBottom: "24px",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <Typography variant="title2">Policies</Typography>
          <Typography variant="text3" color={COLORS.santasGrey}>
            Common agreement for several markets.{" "}
            <Link
              href="https://docs.wildcat.finance/"
              style={{ color: COLORS.santasGrey }}
            >
              Learn more
            </Link>
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          width: "100%",
          padding: "0 24px",
          margin: "0 0 24px 0",
          display: "flex",
          gap: "6px",
        }}
      >
        <FilterTextField
          value={policyName}
          setValue={setPolicyName}
          placeholder="Search by Name"
        />

        <SmallFilterSelect
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
          <Box
            sx={{
              height: "calc(100vh - 43px - 52px - 52px - 110px - 36px - 30px)",
              width: "100%",
              overflow: "auto",
              overflowY: "auto",
            }}
          >
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
          </Box>
        )}
      </Box>
    </Box>
  )
}
