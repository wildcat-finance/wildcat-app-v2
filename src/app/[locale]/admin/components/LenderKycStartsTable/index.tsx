"use client"

import { useMemo, useState } from "react"

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
import {
  SmallFilterSelect,
  SmallFilterSelectItem,
} from "@/components/SmallFilterSelect"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { LENDER_KYC_SAMPLE_ROWS } from "@/lib/lenderKyc/mockService"
import { COLORS } from "@/theme/colors"
import { dayjs } from "@/utils/dayjs"
import { trimAddress } from "@/utils/formatters"

import { LenderKycFilter, LenderKycTableRow, TypeSafeColDef } from "./interface"
import {
  buildLenderKycCsv,
  downloadCsv,
  formatCsvUtcDateTime,
  formatUtcDateTime,
  LENDER_KYC_OUTCOME_KEYS,
  matchesFilter,
  OUTCOME_CHIP_COLORS,
  outcomeKey,
  outcomeLabel,
} from "./utils"
import { useLenderKycStarts } from "../../hooks/useLenderKycStarts"

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

export const LenderKycStartsTable = () => {
  const { t } = useTranslation()
  const { getAddressUrl } = useBlockExplorer()
  const { data, isLoading } = useLenderKycStarts()
  const [filter, setFilter] = useState<LenderKycFilter>("all")
  const [showSampleRows, setShowSampleRows] = useState(false)
  const [outcomeFilter, setOutcomeFilter] = useState<SmallFilterSelectItem[]>(
    [],
  )

  const outcomeOptions: SmallFilterSelectItem[] = LENDER_KYC_OUTCOME_KEYS.map(
    (key) => ({ id: key, name: t(`admin.lenderKyc.outcomes.${key}`) }),
  )

  const notProvided = t("admin.lenderKyc.values.notProvided")

  const rows: LenderKycTableRow[] = useMemo(() => {
    const source = [
      ...(data ?? []).map((row) => ({ ...row, isSample: false })),
      ...(showSampleRows ? LENDER_KYC_SAMPLE_ROWS : []).map((row) => ({
        ...row,
        isSample: true,
      })),
    ]
    return source
      .filter((row) => matchesFilter(row, filter))
      .filter(
        (row) =>
          outcomeFilter.length === 0 ||
          outcomeFilter.some((item) => item.id === outcomeKey(row)),
      )
      .map((row) => ({
        ...row,
        id: `${row.isSample ? "sample" : "live"}:${row.address}`,
        name: row.details?.fullName || undefined,
        email: row.details?.email || undefined,
        company: row.details?.companyName || undefined,
        lenderType: row.details?.lenderType
          ? t(`lenderKyc.modal.lenderTypes.${row.details.lenderType}`)
          : undefined,
      }))
  }, [data, showSampleRows, filter, outcomeFilter, t])

  const exportRows = rows.filter((row) => !row.isSample)

  const emptyStateKey =
    data?.length || showSampleRows ? "filteredEmpty" : "empty"

  const signedLabel = (row: LenderKycTableRow) =>
    row.termsVersion
      ? t("admin.lenderKyc.values.signedYes", { version: row.termsVersion })
      : t("admin.lenderKyc.values.no")

  const renderClickCell = (value: string | undefined) =>
    value ? (
      <CellText value={formatUtcDateTime(value)} />
    ) : (
      <CellText value={t("admin.lenderKyc.values.walletSwitch")} muted />
    )

  const forwardedLabel = (row: LenderKycTableRow) =>
    row.forwardedAt
      ? formatUtcDateTime(row.forwardedAt)
      : t("admin.lenderKyc.values.notForwarded")

  const columns: TypeSafeColDef<LenderKycTableRow>[] = [
    {
      field: "address",
      headerName: t("admin.lenderKyc.columns.wallet"),
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
              label={t("admin.lenderKyc.sampleTag")}
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
      field: "firstClickedAt",
      headerName: t("admin.lenderKyc.columns.firstClicked"),
      minWidth: 140,
      flex: 1,
      renderCell: ({ value }) => renderClickCell(value),
    },
    {
      field: "lastClickedAt",
      headerName: t("admin.lenderKyc.columns.lastClicked"),
      minWidth: 140,
      flex: 1,
      renderCell: ({ value }) => renderClickCell(value),
    },
    {
      field: "outcome",
      headerName: t("admin.lenderKyc.columns.outcome"),
      minWidth: 220,
      flex: 1,
      renderCell: (params) => {
        const row = params.row as LenderKycTableRow
        return (
          <Chip
            label={outcomeLabel(row, t)}
            sx={OUTCOME_CHIP_COLORS[row.outcome ?? "pending"]}
          />
        )
      },
    },
    {
      field: "outcomeAt",
      headerName: t("admin.lenderKyc.columns.outcomeTime"),
      minWidth: 140,
      flex: 1,
      renderCell: ({ value }) => <CellText value={formatUtcDateTime(value)} />,
    },
    {
      field: "termsVersion",
      headerName: t("admin.lenderKyc.columns.signed"),
      minWidth: 150,
      flex: 1,
      renderCell: ({ row }) => (
        <CellText value={signedLabel(row)} muted={!row.termsVersion} />
      ),
    },
    {
      field: "forwardedAt",
      headerName: t("admin.lenderKyc.columns.forwarded"),
      minWidth: 170,
      flex: 1,
      renderCell: ({ row }) => (
        <CellText value={forwardedLabel(row)} muted={!row.forwardedAt} />
      ),
    },
    {
      field: "name",
      headerName: t("admin.lenderKyc.columns.name"),
      minWidth: 130,
      flex: 1,
      renderCell: ({ value }) => (
        <CellText value={value ?? notProvided} muted={!value} />
      ),
    },
    {
      field: "email",
      headerName: t("admin.lenderKyc.columns.email"),
      minWidth: 190,
      flex: 1,
      renderCell: ({ value }) => (
        <CellText value={value ?? notProvided} muted={!value} />
      ),
    },
    {
      field: "company",
      headerName: t("admin.lenderKyc.columns.company"),
      minWidth: 130,
      flex: 1,
      renderCell: ({ value }) => (
        <CellText value={value ?? notProvided} muted={!value} />
      ),
    },
    {
      field: "lenderType",
      headerName: t("admin.lenderKyc.columns.lenderType"),
      minWidth: 130,
      flex: 1,
      renderCell: ({ value }) => (
        <CellText value={value ?? notProvided} muted={!value} />
      ),
    },
  ]

  const handleExport = () => {
    const headers = [
      t("admin.lenderKyc.columns.wallet"),
      t("admin.lenderKyc.columns.firstClicked"),
      t("admin.lenderKyc.columns.lastClicked"),
      t("admin.lenderKyc.columns.outcome"),
      t("admin.lenderKyc.columns.outcomeTime"),
      t("admin.lenderKyc.csv.signed"),
      t("admin.lenderKyc.csv.termsVersion"),
      t("admin.lenderKyc.columns.forwarded"),
      t("admin.lenderKyc.columns.name"),
      t("admin.lenderKyc.columns.email"),
      t("admin.lenderKyc.columns.company"),
      t("admin.lenderKyc.columns.lenderType"),
    ]
    const csvRows = exportRows.map((row) => [
      row.address,
      formatCsvUtcDateTime(row.firstClickedAt),
      formatCsvUtcDateTime(row.lastClickedAt),
      outcomeLabel(row, t),
      formatCsvUtcDateTime(row.outcomeAt),
      row.termsVersion
        ? t("admin.lenderKyc.csv.yes")
        : t("admin.lenderKyc.values.no"),
      row.termsVersion ?? "",
      formatCsvUtcDateTime(row.forwardedAt),
      row.name ?? "",
      row.email ?? "",
      row.company ?? "",
      row.lenderType ?? "",
    ])
    downloadCsv(
      `lender-kyc-starts-${filter}-${dayjs.utc().format("YYYY-MM-DD")}.csv`,
      buildLenderKycCsv(headers, csvRows),
    )
  }

  return (
    <Box
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
          {t("admin.lenderKyc.title")}
        </Typography>
        <Typography variant="text3" color={COLORS.manate}>
          {t("admin.lenderKyc.description")}
        </Typography>
      </Box>

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
              label={t(`admin.lenderKyc.filters.${item}`)}
              className="contained"
              sx={{ padding: "6px 16px" }}
            />
          ))}
        </Tabs>
        <SmallFilterSelect
          placeholder={t("admin.lenderKyc.outcomeFilter")}
          options={outcomeOptions}
          selected={outcomeFilter}
          setSelected={setOutcomeFilter}
        />
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
          {t("admin.lenderKyc.sampleRows")}
        </Button>
        <Button
          variant="contained"
          size="small"
          disabled={!exportRows.length}
          onClick={handleExport}
          sx={{ height: "32px" }}
        >
          {t("admin.lenderKyc.exportCsv")}
        </Button>
      </Box>

      {isLoading && (
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

      {!isLoading && !rows.length && (
        <Box display="flex" flexDirection="column" padding="24px 16px 12px">
          <Typography variant="title3" color={COLORS.blackRock}>
            {t(`admin.lenderKyc.${emptyStateKey}.title`)}
          </Typography>
          <Typography variant="text3" color={COLORS.santasGrey}>
            {t(`admin.lenderKyc.${emptyStateKey}.subtitle`)}
          </Typography>
        </Box>
      )}

      {!isLoading && !!rows.length && (
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
        />
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: "12px",
        }}
      >
        <Alert
          color="blue"
          variant="text3"
          sx={{ maxWidth: "none" }}
          text={t("admin.lenderKyc.notes.separateWallets")}
        />
        <Alert
          color="blue"
          variant="text3"
          sx={{ maxWidth: "none" }}
          text={t("admin.lenderKyc.notes.csvSafety")}
        />
      </Box>
    </Box>
  )
}
