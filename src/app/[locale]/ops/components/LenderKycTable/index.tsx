"use client"

import { useEffect, useMemo, useState } from "react"

import {
  Box,
  Button,
  Chip,
  Skeleton,
  Tab,
  Tabs,
  Typography,
} from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"
import { useTranslation } from "react-i18next"

import { MarketWithdrawalRequetstCell } from "@/app/[locale]/borrower/market/[address]/components/MarketAuthorisedLenders/style"
import { Alert } from "@/components/Alert"
import { LinkGroup } from "@/components/LinkComponent"
import { TablePagination } from "@/components/TablePagination"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { LenderKycApiError } from "@/lib/lenderKyc/apiClient"
import { COLORS } from "@/theme/colors"
import { dayjs } from "@/utils/dayjs"
import { trimAddress } from "@/utils/formatters"

import { LenderKycFilter, LenderKycTableRow, TypeSafeColDef } from "./interface"
import { LENDER_KYC_SAMPLE_ROWS } from "./sampleRows"
import {
  buildLenderKycCsv,
  downloadCsv,
  formatCsvUtcDateTime,
  formatUtcDateTime,
  matchesFilter,
} from "./utils"
import { useOpsLenderKyc } from "../../hooks/useOpsLenderKyc"

const FILTERS: LenderKycFilter[] = ["all", "withDetails"]

const CellText = ({
  value,
  muted,
}: {
  value: string | undefined
  muted?: boolean
}) => (
  <Typography
    variant="text3"
    color={muted ? COLORS.santasGrey : COLORS.blackRock}
    sx={{
      width: "100%",
      paddingRight: "12px",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }}
  >
    {value}
  </Typography>
)

const MessageBlock = ({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) => (
  <Box display="flex" flexDirection="column" padding="24px 16px 12px">
    <Typography variant="title3" color={COLORS.blackRock}>
      {title}
    </Typography>
    <Typography variant="text3" color={COLORS.santasGrey}>
      {subtitle}
    </Typography>
  </Box>
)

export const LenderKycTable = () => {
  const { t } = useTranslation()
  const { getAddressUrl } = useBlockExplorer()
  const { stringID: networkId } = useSelectedNetwork()
  const {
    data,
    isLoading,
    isError,
    error,
    errorUpdateCount,
    dataUpdatedAt,
    isForbidden,
  } = useOpsLenderKyc()
  const [lastError, setLastError] = useState<unknown>()

  useEffect(() => {
    if (error) setLastError(error)
  }, [error])
  const [filter, setFilter] = useState<LenderKycFilter>("all")
  const [showSampleRows, setShowSampleRows] = useState(false)
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 50,
    page: 0,
  })

  useEffect(() => {
    setPaginationModel((previous) => ({ ...previous, page: 0 }))
  }, [filter, showSampleRows])

  const notProvided = t("ops.lenderKyc.values.notProvided")
  const unreadable = t("ops.lenderKyc.values.unreadable")
  const missingDetailsLabel = (row: LenderKycTableRow) =>
    row.detailsUnreadable ? unreadable : notProvided

  const liveData = isForbidden ? undefined : data
  const loadFailed = !liveData && errorUpdateCount > 0
  const isStale = isError && !!liveData
  const showSkeleton = isLoading && errorUpdateCount === 0
  const isStorageUnavailable =
    lastError instanceof LenderKycApiError && lastError.status === 503

  const rows: LenderKycTableRow[] = useMemo(() => {
    const source = [
      ...(showSampleRows ? LENDER_KYC_SAMPLE_ROWS : []).map((row) => ({
        ...row,
        isSample: true,
      })),
      ...(liveData ?? []).map((row) => ({ ...row, isSample: false })),
    ]
    return source
      .filter((row) => matchesFilter(row, filter))
      .map((row) => ({
        ...row,
        id: `${row.isSample ? "sample" : "live"}:${row.address}`,
        name: row.details?.fullName || undefined,
        email: row.details?.email || undefined,
        company: row.details?.companyName || undefined,
        lenderType: row.details?.lenderTypes.length
          ? row.details.lenderTypes
              .map((type) => t(`lenderKyc.modal.lenderTypes.${type}`))
              .join(", ")
          : undefined,
      }))
  }, [liveData, showSampleRows, filter, t])

  const exportRows = rows.filter((row) => !row.isSample)

  const emptyStateKey =
    liveData?.length || showSampleRows ? "filteredEmpty" : "empty"

  const columns: TypeSafeColDef<LenderKycTableRow>[] = [
    {
      field: "address",
      headerName: t("ops.lenderKyc.columns.wallet"),
      minWidth: showSampleRows ? 240 : 176,
      flex: 1,
      sortable: false,
      renderCell: ({ value, row }) => (
        <Box sx={MarketWithdrawalRequetstCell}>
          <Typography sx={{ minWidth: "92px" }} variant="text3">
            {trimAddress(value)}
          </Typography>
          <LinkGroup linkValue={getAddressUrl(value)} copyValue={value} />
          {row.isSample && (
            <Chip
              label={t("ops.lenderKyc.sampleTag")}
              size="small"
              sx={{
                marginLeft: "8px",
                backgroundColor: COLORS.oasis,
                color: COLORS.butteredRum,
              }}
            />
          )}
        </Box>
      ),
    },
    {
      field: "firstSignedAt",
      headerName: t("ops.lenderKyc.columns.firstSigned"),
      minWidth: 150,
      flex: 1,
      renderCell: ({ value }) => <CellText value={formatUtcDateTime(value)} />,
    },
    {
      field: "lastSignedAt",
      headerName: t("ops.lenderKyc.columns.lastSigned"),
      minWidth: 150,
      flex: 1,
      renderCell: ({ value }) => <CellText value={formatUtcDateTime(value)} />,
    },
    {
      field: "termsVersion",
      headerName: t("ops.lenderKyc.columns.termsVersion"),
      minWidth: 110,
      flex: 0.6,
      renderCell: ({ value }) => <CellText value={value} />,
    },
    {
      field: "name",
      headerName: t("ops.lenderKyc.columns.name"),
      minWidth: 130,
      flex: 1,
      renderCell: ({ value, row }) => (
        <CellText value={value ?? missingDetailsLabel(row)} muted={!value} />
      ),
    },
    {
      field: "email",
      headerName: t("ops.lenderKyc.columns.email"),
      minWidth: 190,
      flex: 1,
      renderCell: ({ value, row }) => (
        <CellText value={value ?? missingDetailsLabel(row)} muted={!value} />
      ),
    },
    {
      field: "company",
      headerName: t("ops.lenderKyc.columns.company"),
      minWidth: 130,
      flex: 1,
      renderCell: ({ value, row }) => (
        <CellText value={value ?? missingDetailsLabel(row)} muted={!value} />
      ),
    },
    {
      field: "lenderType",
      headerName: t("ops.lenderKyc.columns.lenderType"),
      minWidth: 200,
      flex: 1.5,
      renderCell: ({ value }) => (
        <CellText value={value ?? notProvided} muted={!value} />
      ),
    },
  ]

  const handleExport = () => {
    const headers = [
      t("ops.lenderKyc.columns.wallet"),
      t("ops.lenderKyc.columns.firstSigned"),
      t("ops.lenderKyc.columns.lastSigned"),
      t("ops.lenderKyc.columns.termsVersion"),
      t("ops.lenderKyc.columns.name"),
      t("ops.lenderKyc.columns.email"),
      t("ops.lenderKyc.columns.company"),
      t("ops.lenderKyc.columns.lenderType"),
    ]
    const csvRows = exportRows.map((row) => [
      row.address,
      formatCsvUtcDateTime(row.firstSignedAt),
      formatCsvUtcDateTime(row.lastSignedAt),
      row.termsVersion,
      row.name ?? (row.detailsUnreadable ? unreadable : ""),
      row.email ?? (row.detailsUnreadable ? unreadable : ""),
      row.company ?? (row.detailsUnreadable ? unreadable : ""),
      row.lenderType ?? "",
    ])
    downloadCsv(
      `lender-verifications-${networkId}-${filter}-${dayjs
        .utc()
        .format("YYYY-MM-DD")}.csv`,
      buildLenderKycCsv(headers, csvRows),
    )
  }

  return (
    <Box
      data-hj-suppress
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        gap: "20px",
        marginTop: "32px",
        paddingBottom: "32px",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <Typography variant="title3" color={COLORS.blackRock}>
          {t("ops.lenderKyc.title")}
        </Typography>
        <Typography variant="text3" color={COLORS.manate}>
          {t("ops.lenderKyc.description")}
        </Typography>
      </Box>

      {isForbidden ? (
        <MessageBlock
          title={t("ops.lenderKyc.noAccess.title")}
          subtitle={t("ops.lenderKyc.noAccess.subtitle")}
        />
      ) : (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <Tabs
              value={filter}
              onChange={(_, value: LenderKycFilter) => setFilter(value)}
              className="contained"
              sx={{ height: "40px" }}
            >
              {FILTERS.map((item) => (
                <Tab
                  key={item}
                  value={item}
                  label={t(`ops.lenderKyc.filters.${item}`)}
                  className="contained"
                  sx={{ padding: "6px 16px" }}
                />
              ))}
            </Tabs>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              onClick={() => setShowSampleRows((value) => !value)}
              sx={{
                height: "32px",
                ...(showSampleRows && {
                  backgroundColor: COLORS.glitter,
                  color: COLORS.ultramarineBlue,
                }),
              }}
            >
              {t("ops.lenderKyc.sampleRows")}
            </Button>
            <Button
              variant="contained"
              size="small"
              disabled={!exportRows.length || isError}
              onClick={handleExport}
              sx={{ height: "32px" }}
            >
              {t("ops.lenderKyc.exportCsv")}
            </Button>
          </Box>

          {showSkeleton && (
            <Box display="flex" flexDirection="column" rowGap="8px">
              {["first", "second", "third", "fourth"].map((key) => (
                <Skeleton
                  key={key}
                  height="52px"
                  width="100%"
                  sx={{ bgcolor: COLORS.athensGrey }}
                />
              ))}
            </Box>
          )}

          {isStale && (
            <Alert
              color="amber"
              variant="text3"
              sx={{ maxWidth: "none" }}
              text={t("ops.lenderKyc.staleData", {
                time: formatUtcDateTime(new Date(dataUpdatedAt).toISOString()),
              })}
            />
          )}

          {loadFailed && (
            <MessageBlock
              title={t("ops.lenderKyc.loadError.title")}
              subtitle={t(
                isStorageUnavailable
                  ? "ops.lenderKyc.loadError.storageSubtitle"
                  : "ops.lenderKyc.loadError.subtitle",
              )}
            />
          )}

          {!showSkeleton && !loadFailed && !rows.length && (
            <MessageBlock
              title={t(`ops.lenderKyc.${emptyStateKey}.title`)}
              subtitle={t(`ops.lenderKyc.${emptyStateKey}.subtitle`)}
            />
          )}

          {!showSkeleton && !!rows.length && (
            <DataGrid
              sx={{
                overflow: "auto",
                maxWidth: "calc(100vw - 267px)",
                "& .MuiDataGrid-cell": {
                  minHeight: "52px",
                  height: "auto",
                  cursor: "default",
                  display: "flex",
                  alignItems: "center",
                },
              }}
              rows={rows}
              columns={columns}
              columnHeaderHeight={40}
              getRowHeight={() => "auto"}
              disableRowSelectionOnClick
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[50]}
              slots={{ pagination: TablePagination }}
              hideFooter={rows.length <= paginationModel.pageSize}
            />
          )}
        </>
      )}
    </Box>
  )
}
