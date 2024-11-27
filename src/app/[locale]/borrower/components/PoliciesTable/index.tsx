import * as React from "react"

import {
  Accordion,
  AccordionSummary,
  Box,
  Skeleton,
  Typography,
} from "@mui/material"
import { DataGrid, GridRowsProp } from "@mui/x-data-grid"
import { HooksKind } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

import { PolicyDataT, PoliciesTableProps, TypeSafeColDef } from "./interface"
import { useGetBorrowerHooksDataWithSubgraph } from "../../hooks/useGetBorrowerHooksData"
import { LinkCell } from "../MarketsTables/style"

export const PoliciesTable = ({ label, isOpen }: PoliciesTableProps) => {
  const {
    data: hooksData,
    isLoading,
    ...queryData
  } = useGetBorrowerHooksDataWithSubgraph()

  const editPolicyLink = (policy: string) =>
    `${ROUTES.borrower.editPolicy}?policy=${encodeURIComponent(policy)}`

  const rows: GridRowsProp<PolicyDataT> = [
    ...(hooksData?.hooksInstances.map((policy) => ({
      id: policy.address,
      name: policy.name || "Unnamed Policy",
      kind: policy.kind === HooksKind.OpenTerm ? "Open Term" : "Fixed Term",
      numMarkets: policy.numMarkets || 0,
      accessRequirements:
        policy.roleProviders.length === 1 ? "Manual Approval" : "Self-Onboard",
    })) ?? []),
    ...(hooksData?.controller
      ? [
          {
            id: hooksData.controller.address,
            name: "V1 Markets",
            kind: HooksKind.OpenTerm,
            numMarkets: hooksData.controller.numMarkets || 0,
            accessRequirements: "Manual Approval",
          },
        ]
      : []),
  ]

  const columns: TypeSafeColDef<PolicyDataT>[] = [
    {
      field: "name",
      headerName: "Policy Name",
      flex: 3.35,
      minWidth: 160,
      maxWidth: 360,
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
      field: "kind",
      headerName: "Market Type",
      maxWidth: 146,
      minWidth: 130,
      flex: 2,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <Link
          href={editPolicyLink(params.row.id)}
          style={{ ...LinkCell, justifyContent: "flex-start" }}
        >
          <Box width={130}>
            <MarketTypeChip {...params.value} />
          </Box>
        </Link>
      ),
    },
    {
      field: "numMarkets",
      headerName: "Markets",
      maxWidth: 146,
      minWidth: 130,
      flex: 2,
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
      field: "accessRequirements",
      headerName: "Access Requirements",
      flex: 2,
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
  return (
    <Accordion sx={{ width: "100%", minWidth: 0 }} defaultExpanded={isOpen}>
      <AccordionSummary>
        <Box display="flex" columnGap="4px">
          <Typography variant="text3">{label}</Typography>
          <Typography variant="text3" color={COLORS.santasGrey}>
            {isLoading ? "are loading" : rows.length}
          </Typography>
        </Box>
      </AccordionSummary>

      {isLoading && (
        <Box
          display="flex"
          flexDirection="column"
          padding="32px 16px"
          rowGap="8px"
        >
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
        </Box>
      )}

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
    </Accordion>
  )
}
