"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormLabel,
  IconButton,
  LinearProgress,
  Stack,
  Switch,
  SvgIcon,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material"

import Cross from "@/assets/icons/cross_icon.svg"
import {
  CanonicalExportRequest,
  ExportProgress,
  ExportRequest,
  ExportStatementType,
} from "@/lib/export/types"
import { COLORS } from "@/theme/colors"

import { ExportModalProps } from "./interface"

type MarketSelection = "current" | "all" | "custom"
type DateSelection = "full" | "year" | "custom"
type MarketOption = { address: string; name: string; symbol: string }
type SegmentedOption<T extends string> = { label: string; value: T }

const sectionLabelSx = {
  color: COLORS.santasGrey,
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  lineHeight: "18px",
  marginBottom: "6px",
}

const actionButtonSx = { borderRadius: "10px", minHeight: "44px" }
const statusAlertSx = {
  borderRadius: "10px",
  padding: "4px 12px",
  "& .MuiAlert-icon": { padding: "6px 0" },
  "& .MuiAlert-message": { padding: "6px 0" },
}

const SegmentedControl = <T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string
  value: T
  options: readonly SegmentedOption<T>[]
  disabled: boolean
  onChange: (value: T) => void
}) => (
  <ToggleButtonGroup
    exclusive
    aria-label={label}
    value={value}
    onChange={(_event, next: T | null) => {
      if (next) onChange(next)
    }}
    sx={{
      backgroundColor: COLORS.athensGrey,
      borderRadius: "10px",
      display: "grid",
      gap: "3px",
      gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      padding: "3px",
      width: "100%",
      "& .MuiToggleButtonGroup-grouped": {
        border: "0 !important",
        borderRadius: "7px !important",
        color: COLORS.blackRock07,
        fontSize: "13px",
        fontWeight: 600,
        lineHeight: "18px",
        minWidth: 0,
        padding: { xs: "8px 5px", sm: "7px 10px" },
        textTransform: "none",
        "&.Mui-selected": {
          backgroundColor: COLORS.white,
          boxShadow: "0 2px 6px rgba(20, 20, 20, 0.08)",
          color: COLORS.bunker,
          "&:hover": { backgroundColor: COLORS.white },
        },
        "&.Mui-disabled": {
          border: "0 !important",
        },
        "&.Mui-disabled.Mui-selected": {
          backgroundColor: COLORS.white,
          color: COLORS.blackRock07,
        },
        "&:hover": { backgroundColor: COLORS.blackRock006 },
      },
    }}
  >
    {options.map((option) => (
      <ToggleButton key={option.value} disabled={disabled} value={option.value}>
        {option.label}
      </ToggleButton>
    ))}
  </ToggleButtonGroup>
)

const phaseLabels: Record<string, string> = {
  queued: "Waiting to start",
  discovering_markets: "Finding selected markets",
  reading_history: "Reading and verifying market history",
  building_transactions: "Building transaction history",
  building_daily_history: "Building daily market history",
  checking_balances: "Checking market balances",
  finalizing_market_data: "Finalizing market data",
  loading_cached_market_data: "Loading previously verified market data",
  market_complete: "Market data complete",
  loading_market_data: "Loading market data",
  building_position_data: "Building position data",
  preparing_bundle: "Preparing export files",
  creating_statements: "Creating statements",
  creating_zip: "Creating ZIP",
  uploading_export: "Saving export",
  finalizing: "Finalizing export",
  completed: "Export complete",
}

export const exportPhaseLabel = (phase: string) => {
  const marketPhase = phase.match(/^(.+)_(\d+)_of_(\d+)$/)
  if (marketPhase) {
    const [, stage, current, total] = marketPhase
    const label = phaseLabels[stage] ?? stage.replaceAll("_", " ")
    return `${label} — market ${current} of ${total}`
  }
  return phaseLabels[phase] ?? phase.replaceAll("_", " ")
}

export const exportErrorMessage = (message: string) => {
  if (/RPC HTTP 429|rate limit/i.test(message)) {
    return "Blockchain data providers are temporarily busy. Please try the export again shortly."
  }
  return message.replace(/^Step "[^"]+" failed after \d+ retries:\s*/i, "")
}

const requestOptionsKey = (request: ExportRequest | CanonicalExportRequest) =>
  JSON.stringify({
    chainId: request.chainId,
    markets:
      request.markets === "all"
        ? "all"
        : [
            ...new Set(request.markets.map((item) => item.toLowerCase())),
          ].sort(),
    statements: [...new Set(request.statements)].sort(),
    addresses: [
      ...new Set(request.addresses.map((item) => item.toLowerCase())),
    ].sort(),
    dateFrom: request.dateFrom,
    dateTo: request.dateTo,
    format: request.format,
  })

const splitAddresses = (value: string) => [
  ...new Set(
    value
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  ),
]

export const ExportModal = ({
  open,
  onClose,
  chainId,
  marketAddress,
  defaultAddress,
}: ExportModalProps) => {
  const [marketSelection, setMarketSelection] = useState<MarketSelection>("all")
  const [marketOptions, setMarketOptions] = useState<MarketOption[]>([])
  const [selectedMarketOptions, setSelectedMarketOptions] = useState<
    MarketOption[]
  >([])
  const [marketsLoading, setMarketsLoading] = useState(false)
  const [statements, setStatements] = useState<ExportStatementType[]>([
    "market_condition",
  ])
  const [addresses, setAddresses] = useState(defaultAddress ?? "")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [dateSelection, setDateSelection] = useState<DateSelection>("full")
  const [calendarYear, setCalendarYear] = useState(
    String(new Date().getUTCFullYear()),
  )
  const [format, setFormat] = useState<"pdf" | "xlsx">("pdf")
  const [jobId, setJobId] = useState<string>()
  const [progress, setProgress] = useState<ExportProgress>()
  const [jobRequest, setJobRequest] = useState<CanonicalExportRequest>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRestoringJob, setIsRestoringJob] = useState(false)
  const [error, setError] = useState<string>()
  const shouldHydrateRestoredJob = useRef(false)
  const storageKey = `wildcat-export-job:${chainId}`

  const hydrateForm = useCallback(
    (request: CanonicalExportRequest) => {
      if (request.markets === "all") {
        setMarketSelection("all")
        setSelectedMarketOptions([])
      } else if (
        request.markets.length === 1 &&
        request.markets[0].toLowerCase() === marketAddress.toLowerCase()
      ) {
        setMarketSelection("current")
        setSelectedMarketOptions([])
      } else {
        setMarketSelection("custom")
        setSelectedMarketOptions(
          request.markets.map((address) => ({
            address,
            name: address,
            symbol: "Market",
          })),
        )
      }
      setStatements(request.statements)
      setAddresses(request.addresses.join("\n"))
      setFormat(request.format)

      const year = request.dateFrom?.slice(0, 4)
      if (!request.dateFrom && !request.dateTo) {
        setDateSelection("full")
        setDateFrom("")
        setDateTo("")
      } else if (
        year &&
        request.dateFrom === `${year}-01-01` &&
        request.dateTo === `${year}-12-31`
      ) {
        setDateSelection("year")
        setCalendarYear(year)
        setDateFrom("")
        setDateTo("")
      } else {
        setDateSelection("custom")
        setDateFrom(request.dateFrom ?? "")
        setDateTo(request.dateTo ?? "")
      }
    },
    [marketAddress],
  )

  useEffect(() => {
    if (!open || jobId) return
    const stored = window.sessionStorage.getItem(storageKey)
    if (stored) {
      shouldHydrateRestoredJob.current = true
      setIsRestoringJob(true)
      setJobId(stored)
    }
  }, [jobId, open, storageKey])

  useEffect(() => {
    if (jobId) window.sessionStorage.setItem(storageKey, jobId)
  }, [jobId, storageKey])

  useEffect(() => {
    if (defaultAddress && !addresses) setAddresses(defaultAddress)
  }, [addresses, defaultAddress])

  const selectedMarkets = useMemo(() => {
    if (marketSelection === "all") return "all" as const
    if (marketSelection === "current") return [marketAddress.toLowerCase()]
    return selectedMarketOptions.map(({ address }) => address.toLowerCase())
  }, [marketAddress, marketSelection, selectedMarketOptions])

  const formRequest = useMemo<ExportRequest>(() => {
    const selectedDateFrom =
      dateSelection === "year" ? `${calendarYear}-01-01` : dateFrom
    const selectedDateTo =
      dateSelection === "year" ? `${calendarYear}-12-31` : dateTo
    return {
      chainId,
      markets: selectedMarkets,
      statements,
      addresses: statements.includes("position")
        ? splitAddresses(addresses)
        : [],
      ...(dateSelection !== "full" && selectedDateFrom
        ? { dateFrom: selectedDateFrom }
        : {}),
      ...(dateSelection !== "full" && selectedDateTo
        ? { dateTo: selectedDateTo }
        : {}),
      format,
    }
  }, [
    addresses,
    calendarYear,
    chainId,
    dateFrom,
    dateSelection,
    dateTo,
    format,
    selectedMarkets,
    statements,
  ])

  const hasRequestChanges = Boolean(
    jobRequest &&
      requestOptionsKey(formRequest) !== requestOptionsKey(jobRequest),
  )

  useEffect(() => {
    if (!open || marketSelection !== "custom" || marketOptions.length > 0)
      return undefined
    let active = true
    setMarketsLoading(true)
    fetch(`/api/export/markets?chainId=${chainId}`, { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as {
          markets?: MarketOption[]
          error?: string
        }
        if (!response.ok)
          throw new Error(body.error ?? "Unable to load markets")
        if (active) {
          setMarketOptions(body.markets ?? [])
          setSelectedMarketOptions((current) => {
            const selected = new Set(
              (current.length > 0
                ? current.map(({ address }) => address)
                : [marketAddress]
              ).map((address) => address.toLowerCase()),
            )
            return (body.markets ?? []).filter(({ address }) =>
              selected.has(address.toLowerCase()),
            )
          })
        }
      })
      .catch((loadError) => {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load markets",
          )
      })
      .finally(() => {
        if (active) setMarketsLoading(false)
      })
    return () => {
      active = false
    }
  }, [chainId, marketAddress, marketOptions.length, marketSelection, open])

  const poll = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/export/jobs/${id}`, {
        cache: "no-store",
      })
      const body = (await response.json()) as ExportProgress & {
        error?: string
      }
      if (!response.ok)
        throw new Error(body.error ?? "Unable to load export job")
      setProgress(body)
      if (body.request) {
        setJobRequest(body.request)
        if (shouldHydrateRestoredJob.current) {
          hydrateForm(body.request)
          shouldHydrateRestoredJob.current = false
        }
      }
      setIsRestoringJob(false)
      return body
    },
    [hydrateForm],
  )

  useEffect(() => {
    if (!jobId) return undefined
    let active = true
    let timer: ReturnType<typeof setTimeout>
    let delay = 1_500
    let lastProgress = -1
    const update = async () => {
      try {
        const next = await poll(jobId)
        if (next.progress !== lastProgress) {
          lastProgress = next.progress
          delay = 1_500
        } else {
          delay = Math.min(delay * 1.35, 10_000)
        }
        if (
          active &&
          next.status !== "completed" &&
          next.status !== "failed" &&
          next.status !== "cancelled"
        ) {
          timer = setTimeout(
            update,
            document.visibilityState === "visible" ? delay : 15_000,
          )
        }
      } catch (pollError) {
        if (active) {
          setIsRestoringJob(false)
          setError(
            pollError instanceof Error
              ? pollError.message
              : "Unable to load export job",
          )
          delay = Math.min(delay * 2, 15_000)
          timer = setTimeout(update, delay)
        }
      }
    }
    update()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [jobId, poll])

  const toggleStatement = (statement: ExportStatementType) => {
    setStatements((current) =>
      current.includes(statement)
        ? current.filter((item) => item !== statement)
        : [...current, statement],
    )
  }

  const submit = async (requestedSnapshot?: string) => {
    setError(undefined)
    if (marketSelection === "custom" && selectedMarkets.length === 0) {
      setError("Enter at least one market address")
      return
    }
    if (
      formRequest.statements.includes("position") &&
      formRequest.addresses.length === 0
    ) {
      setError("Enter at least one address for a position statement")
      return
    }
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/export/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...formRequest,
          ...(requestedSnapshot ? { snapshotBlock: requestedSnapshot } : {}),
        }),
      })
      const body = (await response.json()) as {
        jobId?: string
        status?: ExportProgress["status"]
        downloadUrl?: string
        request?: CanonicalExportRequest
        error?: string
      }
      if (!response.ok || !body.jobId || !body.request) {
        throw new Error(body.error ?? "Unable to start export")
      }
      shouldHydrateRestoredJob.current = false
      setJobRequest(body.request)
      setProgress({
        status: body.status ?? "queued",
        progress: body.status === "completed" ? 100 : 0,
        phase: body.status === "completed" ? "completed" : "queued",
        downloadUrl: body.downloadUrl,
        request: body.request,
      })
      setJobId(body.jobId)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to start export",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const cancel = async () => {
    if (!jobId) return
    setError(undefined)
    try {
      const response = await fetch(`/api/export/jobs/${jobId}`, {
        method: "DELETE",
      })
      const body = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(body.error ?? "Unable to cancel export")
      setProgress({ status: "cancelled", progress: progress?.progress ?? 0 })
      window.sessionStorage.removeItem(storageKey)
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Unable to cancel export",
      )
    }
  }

  const jobIsWorking =
    progress?.status === "queued" || progress?.status === "running"
  const isWorking = isSubmitting || jobIsWorking
  const formDisabled = isWorking || isRestoringJob

  let dialogAction = (
    <Button
      onClick={() => submit()}
      disabled={isWorking || isRestoringJob}
      variant="contained"
      fullWidth
      sx={actionButtonSx}
    >
      Generate export
    </Button>
  )
  if (isSubmitting || isRestoringJob) {
    dialogAction = (
      <Button disabled variant="contained" fullWidth sx={actionButtonSx}>
        {isRestoringJob ? "Loading previous export…" : "Starting export…"}
      </Button>
    )
  } else if (jobIsWorking) {
    dialogAction = (
      <Button
        onClick={cancel}
        color="error"
        variant="outlined"
        fullWidth
        sx={actionButtonSx}
      >
        Cancel export
      </Button>
    )
  } else if (progress?.status === "completed" && progress.downloadUrl) {
    dialogAction = hasRequestChanges ? (
      <Stack width="100%" gap="8px">
        <Button
          onClick={() => submit(jobRequest?.snapshotBlock)}
          variant="contained"
          fullWidth
          sx={actionButtonSx}
        >
          Generate updated ZIP
        </Button>
        <Button
          component="a"
          href={progress.downloadUrl}
          variant="outlined"
          fullWidth
          sx={actionButtonSx}
        >
          Download existing ZIP
        </Button>
      </Stack>
    ) : (
      <Stack width="100%" gap="8px">
        <Button
          component="a"
          href={progress.downloadUrl}
          variant="contained"
          fullWidth
          sx={actionButtonSx}
        >
          Download ZIP
        </Button>
        <Button
          onClick={() => submit()}
          variant="outlined"
          fullWidth
          sx={actionButtonSx}
        >
          Generate fresh ZIP
        </Button>
      </Stack>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: { xs: "16px", sm: "24px" },
          maxHeight: "calc(100dvh - 24px)",
          maxWidth: "760px",
        },
      }}
    >
      <DialogTitle sx={{ padding: { xs: "20px 24px 0", sm: "24px 32px 0" } }}>
        <Box
          sx={{
            alignItems: "flex-start",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Box paddingRight="16px">
            <Typography
              color={COLORS.bunker}
              fontSize={{ xs: "26px", sm: "28px" }}
              fontWeight={600}
              lineHeight="34px"
            >
              Export market data
            </Typography>
            <Typography
              color={COLORS.santasGrey}
              display="block"
              fontSize="14px"
              lineHeight="20px"
              marginTop="2px"
            >
              CSV data pack and manifest are always included. Statements are
              optional extras.
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            aria-label="Close export dialog"
            sx={{ color: COLORS.santasGrey, margin: "-5px -8px 0 0" }}
          >
            <SvgIcon fontSize="big">
              <Cross />
            </SvgIcon>
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{ padding: { xs: "18px 24px", sm: "18px 32px 20px" } }}
      >
        <Stack gap={{ xs: "18px", sm: "20px" }}>
          <Box>
            <FormLabel sx={sectionLabelSx}>Markets</FormLabel>
            <SegmentedControl
              label="Markets"
              value={marketSelection}
              disabled={formDisabled}
              onChange={setMarketSelection}
              options={[
                { value: "current", label: "This market" },
                { value: "all", label: "All V2 on chain" },
                { value: "custom", label: "Selected" },
              ]}
            />
            {marketSelection === "custom" && (
              <Autocomplete
                disabled={formDisabled}
                multiple
                options={marketOptions}
                value={selectedMarketOptions}
                loading={marketsLoading}
                sx={{ marginTop: "12px" }}
                isOptionEqualToValue={(option, value) =>
                  option.address === value.address
                }
                getOptionLabel={(option) =>
                  `${option.symbol} — ${option.name} (${option.address})`
                }
                getOptionDisabled={(option) =>
                  selectedMarketOptions.length >= 50 &&
                  !selectedMarketOptions.some(
                    ({ address }) => address === option.address,
                  )
                }
                onChange={(_event, value) => setSelectedMarketOptions(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Markets"
                    size="small"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {marketsLoading ? (
                            <CircularProgress size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            )}
          </Box>

          <Box>
            <FormLabel sx={sectionLabelSx}>Statements</FormLabel>
            <Stack>
              {(
                [
                  ["market_condition", "Market condition statement"],
                  ["borrower", "Borrower statement"],
                  ["position", "Position statement (entered addresses)"],
                ] as const
              ).map(([statement, label], index) => (
                <FormControlLabel
                  key={statement}
                  disabled={formDisabled}
                  label={label}
                  labelPlacement="start"
                  control={
                    <Switch
                      checked={statements.includes(statement)}
                      size="small"
                      onChange={() => toggleStatement(statement)}
                    />
                  }
                  sx={{
                    borderBottom:
                      index < 2 ? `1px solid ${COLORS.whiteLilac}` : 0,
                    justifyContent: "space-between",
                    margin: 0,
                    padding: "7px 0",
                    width: "100%",
                    "& .MuiFormControlLabel-label": {
                      color: COLORS.bunker,
                      fontSize: "14px",
                      fontWeight: 500,
                      lineHeight: "20px",
                    },
                  }}
                />
              ))}
            </Stack>
            {statements.includes("position") && (
              <Box marginTop="10px">
                <FormLabel sx={sectionLabelSx}>Position addresses</FormLabel>
                <TextField
                  disabled={formDisabled}
                  fullWidth
                  multiline
                  minRows={1}
                  maxRows={3}
                  size="small"
                  value={addresses}
                  onChange={(event) => setAddresses(event.target.value)}
                  placeholder="0x… — separate multiple addresses with commas or spaces"
                  inputProps={{ "aria-label": "Position addresses" }}
                  sx={{
                    height: "auto",
                    "& .MuiInputBase-root": {
                      alignItems: "flex-start",
                      height: "auto",
                      minHeight: "40px",
                    },
                    "& textarea": {
                      lineHeight: "20px",
                    },
                  }}
                />
                <Typography
                  color={COLORS.santasGrey}
                  display="block"
                  fontSize="11px"
                  lineHeight="16px"
                  marginTop="5px"
                >
                  No wallet connection or signature is required; positions are
                  public on chain.
                </Typography>
              </Box>
            )}
          </Box>

          <Box
            sx={{
              alignItems: "start",
              display: "grid",
              gap: { xs: "18px", sm: "20px" },
              gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) 240px" },
            }}
          >
            <Box>
              <FormLabel sx={sectionLabelSx}>Statement period</FormLabel>
              <SegmentedControl
                label="Statement period"
                value={dateSelection}
                disabled={formDisabled}
                onChange={setDateSelection}
                options={[
                  { value: "full", label: "Full history" },
                  { value: "year", label: "Calendar year" },
                  { value: "custom", label: "Custom" },
                ]}
              />
              {dateSelection === "year" && (
                <TextField
                  disabled={formDisabled}
                  fullWidth
                  type="number"
                  label="Calendar year"
                  size="small"
                  value={calendarYear}
                  onChange={(event) => setCalendarYear(event.target.value)}
                  inputProps={{ min: 2020, max: 9999 }}
                  sx={{ marginTop: "10px" }}
                />
              )}
              {dateSelection === "custom" && (
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  gap="10px"
                  marginTop="10px"
                >
                  <TextField
                    disabled={formDisabled}
                    fullWidth
                    type="date"
                    label="From"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                  />
                  <TextField
                    disabled={formDisabled}
                    fullWidth
                    type="date"
                    label="To"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                  />
                </Stack>
              )}
            </Box>

            <Box>
              <FormLabel sx={sectionLabelSx}>Format</FormLabel>
              <SegmentedControl
                label="Statement format"
                value={format}
                disabled={formDisabled}
                onChange={setFormat}
                options={[
                  { value: "pdf", label: "PDF" },
                  { value: "xlsx", label: "XLSX" },
                ]}
              />
            </Box>
          </Box>

          {jobIsWorking && (
            <Box>
              <LinearProgress
                variant={progress ? "determinate" : "indeterminate"}
                value={progress?.progress ?? 0}
              />
              <Typography variant="text3" marginTop="8px" display="block">
                {progress?.status === "queued" ? "Queued" : "Building export"} —{" "}
                {progress?.progress ?? 0}%
              </Typography>
              {progress?.phase && (
                <Typography variant="text4" color="text.secondary">
                  {exportPhaseLabel(progress.phase)}
                </Typography>
              )}
            </Box>
          )}
          {error && (
            <Alert severity="error" sx={statusAlertSx}>
              {error}
            </Alert>
          )}
          {progress?.status === "failed" && (
            <Alert severity="error" sx={statusAlertSx}>
              {progress.error
                ? exportErrorMessage(progress.error)
                : "Export failed"}
            </Alert>
          )}
          {progress?.status === "cancelled" && (
            <Alert severity="info" sx={statusAlertSx}>
              Export cancelled.
            </Alert>
          )}
          {progress?.status === "completed" &&
            progress.downloadUrl &&
            (hasRequestChanges ? (
              <Alert severity="info" sx={statusAlertSx}>
                Your selections have changed. Generate an updated ZIP to include
                them, or download the existing ZIP unchanged.
              </Alert>
            ) : (
              <Alert
                severity="success"
                sx={{
                  ...statusAlertSx,
                  backgroundColor: COLORS.lightGreen,
                  color: "#168A4A",
                }}
              >
                Your export is ready. Download it, or generate a fresh ZIP from
                the latest confirmed block.
              </Alert>
            ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ padding: { xs: "0 24px 20px", sm: "0 32px 24px" } }}>
        {dialogAction}
      </DialogActions>
    </Dialog>
  )
}
