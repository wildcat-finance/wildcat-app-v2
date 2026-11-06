"use client"

import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  createFilterOptions,
  Dialog,
  FormControlLabel,
  FormGroup,
  IconButton,
  MenuItem,
  Popper,
  PopperProps,
  Stack,
  SvgIcon,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material"

import Cross from "@/assets/icons/cross_icon.svg"
import { DateRange } from "@/components/DateRange"
import { DateRangeDates } from "@/components/DateRange/interface"
import { NETWORKS_BY_ID } from "@/config/network"
import {
  CanonicalExportRequest,
  ExportProgress,
  ExportRequest,
  ExportStatementType,
  MAX_EXPORT_MARKETS,
} from "@/lib/export/types"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

import { exportClientHeaders } from "./client"
import { ExportModalProps } from "./interface"
import { MarketChips } from "./MarketChips"
import { ExportProgressTracker } from "./ProgressTracker"
import {
  ActionButtonSx,
  AutocompleteFieldSx,
  AutocompletePopperSx,
  MultiAutocompleteFieldSx,
  BodySx,
  DialogSx,
  FieldLabelSx,
  FooterSx,
  FormatPeriodRowSx,
  HeaderSx,
  MultilineFieldSx,
  NoticeSx,
  StatementRowSx,
  TabSx,
} from "./style"

type MarketSelection = "current" | "borrower" | "custom"
type DateSelection = "full" | "year" | "custom"
type MarketOption = {
  address: string
  name: string
  symbol: string
  borrower: string
  isActive: boolean
}
type BorrowerOption = {
  address: string
  name: string
  marketAddresses: string[]
}
type SegmentedOption<T extends string> = { label: string; value: T }
type NoticeTone = "error" | "info" | "success"
const MARKET_OPTIONS_TIMEOUT_MS = 15_000
const EMPTY_DATES: DateRangeDates = { starting: null, ending: null }
const borrowerFilter = createFilterOptions<BorrowerOption>({
  stringify: (option) => `${option.name} ${option.address}`,
})

const borrowerOptionLabel = (option: BorrowerOption) =>
  option.name === option.address ? trimAddress(option.address, 6) : option.name

const ExportAutocompletePopper = (props: PopperProps) => (
  <Popper
    {...props}
    placement="bottom-start"
    modifiers={[
      {
        name: "preventOverflow",
        options: { boundary: "viewport", padding: 12 },
      },
      { name: "flip", options: { padding: 12 } },
    ]}
    sx={AutocompletePopperSx}
  />
)

export const isoToDisplayDate = (value?: string) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : null
}

export const displayToIsoDate = (value?: string | null) => {
  const match = value?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return undefined
  const [, day, month, year] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return undefined
  }
  return `${year}-${month}-${day}`
}

const FieldLabel = ({ children }: { children: string }) => (
  <Typography variant="text3" component="p" sx={FieldLabelSx}>
    {children}
  </Typography>
)

const Notice = ({
  tone,
  children,
}: {
  tone: NoticeTone
  children: ReactNode
}) => (
  <Box role={tone === "error" ? "alert" : "status"} sx={NoticeSx(tone)}>
    <Box className="notice-dot" />
    <Typography variant="text3" component="div">
      {children}
    </Typography>
  </Box>
)

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
  <Tabs
    aria-label={label}
    className="contained"
    variant="fullWidth"
    value={value}
    onChange={(_event, next: T) => onChange(next)}
    sx={{ width: "100%" }}
  >
    {options.map((option) => (
      <Tab
        key={option.value}
        className="contained"
        disabled={disabled}
        label={option.label}
        value={option.value}
        sx={TabSx}
      />
    ))}
  </Tabs>
)

export const exportErrorMessage = (message: string) => {
  if (/RPC HTTP 429|rate limit/i.test(message)) {
    return "Blockchain data providers are temporarily busy. Please try the export again shortly."
  }
  return message.replace(/^Step "[^"]+" failed after \d+ retries:\s*/i, "")
}

const requestOptionsKey = (request: ExportRequest | CanonicalExportRequest) =>
  JSON.stringify({
    chainId: request.chainId,
    markets: [
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
  borrowerAddress,
  defaultAddress,
}: ExportModalProps) => {
  const networkName = NETWORKS_BY_ID[chainId].name
  const borrowerLabel = (option: BorrowerOption) =>
    `${borrowerOptionLabel(option)} (${networkName} - ${
      option.marketAddresses.length
    } market${option.marketAddresses.length === 1 ? "" : "s"})`
  const [marketSelection, setMarketSelection] =
    useState<MarketSelection>("current")
  const [marketOptions, setMarketOptions] = useState<MarketOption[]>([])
  const [selectedMarketOptions, setSelectedMarketOptions] = useState<
    MarketOption[]
  >([])
  const [borrowerOptions, setBorrowerOptions] = useState<BorrowerOption[]>([])
  const [selectedBorrower, setSelectedBorrower] =
    useState<BorrowerOption | null>(null)
  const [borrowerOptionsLoaded, setBorrowerOptionsLoaded] = useState(false)
  const [marketsLoading, setMarketsLoading] = useState(false)
  const [statements, setStatements] = useState<ExportStatementType[]>([
    "market_condition",
  ])
  const [addresses, setAddresses] = useState(defaultAddress ?? "")
  const [customDates, setCustomDates] = useState<DateRangeDates>(EMPTY_DATES)
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
  const [catalogError, setCatalogError] = useState<string>()
  const shouldHydrateRestoredJob = useRef(false)
  const hasEditedAddresses = useRef(false)
  const storageKey = `wildcat-export-job:${chainId}`

  const hydrateForm = useCallback(
    (request: CanonicalExportRequest) => {
      if (
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
            borrower: "",
            isActive: false,
          })),
        )
      }
      setStatements(request.statements)
      hasEditedAddresses.current = true
      setAddresses(request.addresses.join("\n"))
      setFormat(request.format)

      const year = request.dateFrom?.slice(0, 4)
      if (!request.dateFrom && !request.dateTo) {
        setDateSelection("full")
        setCustomDates(EMPTY_DATES)
      } else if (
        year &&
        request.dateFrom === `${year}-01-01` &&
        request.dateTo === `${year}-12-31`
      ) {
        setDateSelection("year")
        setCalendarYear(year)
        setCustomDates(EMPTY_DATES)
      } else {
        setDateSelection("custom")
        setCustomDates({
          starting: isoToDisplayDate(request.dateFrom),
          ending: isoToDisplayDate(request.dateTo),
        })
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
    if (!hasEditedAddresses.current) setAddresses(defaultAddress ?? "")
  }, [defaultAddress])

  useEffect(() => {
    setMarketOptions([])
    setBorrowerOptions([])
    setSelectedMarketOptions([])
    setSelectedBorrower(null)
    setBorrowerOptionsLoaded(false)
    setCatalogError(undefined)
  }, [chainId])

  useEffect(() => {
    if (borrowerOptions.length === 0) return
    setSelectedBorrower(
      borrowerOptions.find(
        ({ address }) =>
          address.toLowerCase() === borrowerAddress.toLowerCase(),
      ) ?? null,
    )
  }, [borrowerAddress, borrowerOptions])

  const selectedMarkets = useMemo(() => {
    if (marketSelection === "current") return [marketAddress.toLowerCase()]
    if (marketSelection === "borrower") {
      return selectedBorrower?.marketAddresses ?? []
    }
    return selectedMarketOptions.map(({ address }) => address.toLowerCase())
  }, [marketAddress, marketSelection, selectedBorrower, selectedMarketOptions])

  const borrowerSelectionIssue = useMemo(() => {
    if (marketSelection !== "borrower" || marketsLoading) return undefined
    if (!selectedBorrower) return "Choose a borrower with active markets"
    if (selectedBorrower.marketAddresses.length > MAX_EXPORT_MARKETS) {
      return `${borrowerOptionLabel(selectedBorrower)} has ${
        selectedBorrower.marketAddresses.length
      } active markets; borrower exports currently support up to ${MAX_EXPORT_MARKETS}`
    }
    return undefined
  }, [marketSelection, marketsLoading, selectedBorrower])

  const formRequest = useMemo<ExportRequest>(() => {
    const selectedDateFrom =
      dateSelection === "year"
        ? `${calendarYear}-01-01`
        : displayToIsoDate(customDates.starting)
    const selectedDateTo =
      dateSelection === "year"
        ? `${calendarYear}-12-31`
        : displayToIsoDate(customDates.ending)
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
    customDates,
    dateSelection,
    format,
    selectedMarkets,
    statements,
  ])

  const hasRequestChanges = Boolean(
    jobRequest &&
      requestOptionsKey(formRequest) !== requestOptionsKey(jobRequest),
  )

  useEffect(() => {
    const needsCatalog =
      marketSelection === "custom" || marketSelection === "borrower"
    const needsMarkets = marketOptions.length === 0
    const needsBorrowers =
      marketSelection === "borrower" && !borrowerOptionsLoaded
    if (!open || !needsCatalog || (!needsMarkets && !needsBorrowers)) {
      return undefined
    }
    let active = true
    const controller = new AbortController()
    const timeout = window.setTimeout(
      () => controller.abort(),
      MARKET_OPTIONS_TIMEOUT_MS,
    )
    setMarketsLoading(true)
    setCatalogError(undefined)
    const query = new URLSearchParams({ chainId: String(chainId) })
    if (marketSelection === "borrower") query.set("includeBorrowers", "true")
    fetch(`/api/export/markets?${query}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as {
          markets?: MarketOption[]
          borrowers?: BorrowerOption[]
          error?: string
        }
        if (!response.ok)
          throw new Error(body.error ?? "Unable to load markets")
        if (active) {
          setMarketOptions(body.markets ?? [])
          if (body.borrowers) {
            setBorrowerOptions(body.borrowers)
            setBorrowerOptionsLoaded(true)
            setSelectedBorrower((current) => {
              const preferredAddress = (
                current?.address ?? borrowerAddress
              ).toLowerCase()
              return (
                body.borrowers?.find(
                  ({ address }) => address.toLowerCase() === preferredAddress,
                ) ?? null
              )
            })
          }
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
        if (active) {
          let message = "Unable to load markets"
          if (controller.signal.aborted) {
            message = "The market list took too long to load. Please try again."
          } else if (loadError instanceof Error) {
            message = loadError.message
          }
          setCatalogError(message)
        }
      })
      .finally(() => {
        window.clearTimeout(timeout)
        if (active) setMarketsLoading(false)
      })
    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [
    borrowerAddress,
    borrowerOptionsLoaded,
    chainId,
    marketAddress,
    marketOptions.length,
    marketSelection,
    open,
  ])

  useEffect(() => {
    if (!jobId) return undefined
    let active = true
    let timer: ReturnType<typeof setTimeout>
    let delay = 1_500
    let lastProgress = -1
    let lastPhase: string | undefined
    const update = async () => {
      try {
        const response = await fetch(`/api/export/jobs/${jobId}`, {
          cache: "no-store",
          headers: exportClientHeaders(),
        })
        const next = (await response.json()) as ExportProgress
        if (!active) return
        if (!response.ok)
          throw new Error(next.error ?? "Unable to load export job")
        setError(undefined)
        setProgress(next)
        if (next.request && Array.isArray(next.request.markets)) {
          setJobRequest(next.request)
          if (shouldHydrateRestoredJob.current) {
            hydrateForm(next.request)
            shouldHydrateRestoredJob.current = false
          }
        }
        setIsRestoringJob(false)
        if (next.progress !== lastProgress || next.phase !== lastPhase) {
          lastPhase = next.phase
          lastProgress = next.progress
          delay = 1_500
        } else {
          delay = Math.min(delay * 1.35, 10_000)
        }
        if (
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
  }, [jobId, hydrateForm])

  const toggleStatement = (statement: ExportStatementType) => {
    setStatements((current) =>
      current.includes(statement)
        ? current.filter((item) => item !== statement)
        : [...current, statement],
    )
  }

  const selectMarketScope = (selection: MarketSelection) => {
    setCatalogError(undefined)
    setMarketSelection(selection)
  }

  const submit = async () => {
    setError(undefined)
    if (borrowerSelectionIssue) {
      setError(borrowerSelectionIssue)
      return
    }
    if (
      (marketSelection === "custom" || marketSelection === "borrower") &&
      selectedMarkets.length === 0
    ) {
      setError("Enter at least one market address")
      return
    }
    if (
      dateSelection === "custom" &&
      [customDates.starting, customDates.ending].some(
        (value) => value && !displayToIsoDate(value),
      )
    ) {
      setError("Enter statement dates as DD/MM/YYYY")
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
        headers: {
          "content-type": "application/json",
          ...exportClientHeaders(),
        },
        body: JSON.stringify(formRequest),
      })
      const body = (await response.json()) as {
        jobId?: string
        status?: ExportProgress["status"]
        downloadUrl?: string
        snapshotTimestampUtc?: string
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
        snapshotTimestampUtc: body.snapshotTimestampUtc,
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
        headers: exportClientHeaders(),
      })
      const body = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(body.error ?? "Unable to cancel export")
      setProgress({ status: "cancelled", progress: progress?.progress ?? 0 })
      window.sessionStorage.removeItem(storageKey)
      setJobId(undefined)
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

  const exportedAt = progress?.snapshotTimestampUtc
    ? new Date(progress.snapshotTimestampUtc).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "UTC",
      })
    : undefined

  let dialogActions = (
    <Button
      onClick={() => submit()}
      disabled={isWorking || isRestoringJob}
      variant="contained"
      size="large"
      fullWidth
      sx={ActionButtonSx}
    >
      Generate export
    </Button>
  )
  if (isSubmitting || isRestoringJob) {
    dialogActions = (
      <Button
        disabled
        variant="contained"
        size="large"
        fullWidth
        sx={ActionButtonSx}
      >
        {isRestoringJob ? "Loading previous export…" : "Starting export…"}
      </Button>
    )
  } else if (jobIsWorking) {
    dialogActions = (
      <Button
        onClick={cancel}
        color="secondary"
        variant="contained"
        size="large"
        fullWidth
        sx={ActionButtonSx}
      >
        Cancel export
      </Button>
    )
  } else if (progress?.status === "completed" && progress.downloadUrl) {
    dialogActions = hasRequestChanges ? (
      <>
        <Button
          onClick={() => submit()}
          variant="contained"
          size="large"
          fullWidth
          sx={ActionButtonSx}
        >
          Generate updated ZIP
        </Button>
        <Button
          component="a"
          href={progress.downloadUrl}
          color="secondary"
          variant="contained"
          size="large"
          fullWidth
          sx={ActionButtonSx}
        >
          Download existing ZIP
        </Button>
      </>
    ) : (
      <>
        <Button
          component="a"
          href={progress.downloadUrl}
          variant="contained"
          size="large"
          fullWidth
          sx={ActionButtonSx}
        >
          Download ZIP
        </Button>
        <Button
          onClick={() => submit()}
          color="secondary"
          variant="contained"
          size="large"
          fullWidth
          sx={ActionButtonSx}
        >
          Generate fresh ZIP
        </Button>
      </>
    )
  }

  const marketCountLabel = (count: number) =>
    `${count} active market${count === 1 ? "" : "s"}`

  let borrowerHelperText = borrowerSelectionIssue
  if (!borrowerHelperText && selectedBorrower) {
    const count = selectedBorrower.marketAddresses.length
    borrowerHelperText = `Includes ${count} active V2 market${
      count === 1 ? "" : "s"
    } on this chain.`
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-describedby="export-dialog-description"
      aria-labelledby="export-dialog-title"
      maxWidth={false}
      sx={DialogSx}
    >
      <Box sx={HeaderSx}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap="10px"
        >
          <Typography
            component="h2"
            id="export-dialog-title"
            variant="title3"
            color={COLORS.bunker}
          >
            Export market data
          </Typography>
          <IconButton
            disableRipple
            onClick={onClose}
            aria-label="Close export dialog"
          >
            <SvgIcon fontSize="big">
              <Cross />
            </SvgIcon>
          </IconButton>
        </Box>
        <Typography
          id="export-dialog-description"
          variant="text2"
          color={COLORS.manate}
        >
          CSV data pack and manifest are always included. Statements are
          optional extras.
        </Typography>
      </Box>

      <Box sx={BodySx}>
        <Stack gap="20px">
          <Box>
            <FieldLabel>Markets</FieldLabel>
            <SegmentedControl
              label="Markets"
              value={marketSelection}
              disabled={formDisabled}
              onChange={selectMarketScope}
              options={[
                { value: "current", label: "This market" },
                { value: "borrower", label: "Borrower" },
                { value: "custom", label: "Selected" },
              ]}
            />
            {marketSelection === "borrower" && (
              <Box marginTop="12px">
                <Autocomplete
                  disabled={formDisabled}
                  options={borrowerOptions}
                  value={selectedBorrower}
                  loading={marketsLoading}
                  filterOptions={borrowerFilter}
                  isOptionEqualToValue={(option, value) =>
                    option.address === value.address
                  }
                  getOptionLabel={borrowerLabel}
                  onChange={(_event, value) => setSelectedBorrower(value)}
                  PopperComponent={ExportAutocompletePopper}
                  popupIcon={null}
                  renderOption={(props, option) => (
                    <MenuItem {...props} key={option.address}>
                      <Box minWidth={0}>
                        <Typography
                          variant="text3"
                          component="p"
                          overflow="hidden"
                          textOverflow="ellipsis"
                          whiteSpace="nowrap"
                        >
                          {borrowerLabel(option)}
                        </Typography>
                        <Typography
                          variant="text4"
                          component="p"
                          color={COLORS.santasGrey}
                        >
                          {trimAddress(option.address, 6)} ·{" "}
                          {marketCountLabel(option.marketAddresses.length)}
                        </Typography>
                      </Box>
                    </MenuItem>
                  )}
                  renderInput={({ InputProps, inputProps, ...params }) => (
                    <TextField
                      {...params}
                      size="medium"
                      placeholder="Choose a borrower"
                      error={Boolean(borrowerSelectionIssue)}
                      helperText={borrowerHelperText}
                      sx={AutocompleteFieldSx}
                      InputProps={{
                        ...InputProps,
                        inputProps: {
                          ...inputProps,
                          "aria-label": "Borrower",
                          "aria-busy": marketsLoading,
                        },
                        endAdornment: (
                          <>
                            {marketsLoading ? (
                              <CircularProgress
                                aria-label="Loading borrowers"
                                size={18}
                              />
                            ) : null}
                            {InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Box>
            )}
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
                  `${option.symbol} - ${option.name} (${option.address})`
                }
                getOptionDisabled={(option) =>
                  selectedMarketOptions.length >= 50 &&
                  !selectedMarketOptions.some(
                    ({ address }) => address === option.address,
                  )
                }
                onChange={(_event, value) => setSelectedMarketOptions(value)}
                PopperComponent={ExportAutocompletePopper}
                popupIcon={null}
                renderOption={(props, option) => (
                  <MenuItem {...props} key={option.address}>
                    <Box minWidth={0} width="100%">
                      <Typography
                        variant="text3"
                        component="p"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                      >
                        {option.symbol} - {option.name}
                      </Typography>
                      <Typography
                        variant="text4"
                        component="p"
                        color={COLORS.santasGrey}
                      >
                        {option.address}
                      </Typography>
                    </Box>
                  </MenuItem>
                )}
                renderTags={(value) => (
                  <MarketChips
                    items={value.map((option) => ({
                      id: option.address,
                      label: option.symbol || option.name,
                    }))}
                    disabled={formDisabled}
                    onDelete={(address) =>
                      setSelectedMarketOptions((current) =>
                        current.filter((option) => option.address !== address),
                      )
                    }
                  />
                )}
                renderInput={({ InputProps, inputProps, ...params }) => (
                  <TextField
                    {...params}
                    size="medium"
                    placeholder={
                      selectedMarketOptions.length === 0
                        ? "Search markets"
                        : undefined
                    }
                    sx={MultiAutocompleteFieldSx}
                    InputProps={{
                      ...InputProps,
                      inputProps: {
                        ...inputProps,
                        "aria-label": "Selected markets",
                        "aria-busy": marketsLoading,
                      },
                      endAdornment: (
                        <>
                          {marketsLoading ? (
                            <CircularProgress
                              aria-label="Loading markets"
                              size={18}
                            />
                          ) : null}
                          {InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            )}
          </Box>

          <Box>
            <FieldLabel>Statements</FieldLabel>
            <FormGroup sx={{ rowGap: "14px", paddingTop: "6px" }}>
              {(
                [
                  ["market_condition", "Market condition statement"],
                  ["borrower", "Borrower statement"],
                  ["position", "Position statement (entered addresses)"],
                ] as const
              ).map(([statement, label]) => (
                <FormControlLabel
                  key={statement}
                  disabled={formDisabled}
                  label={label}
                  labelPlacement="start"
                  control={
                    <Switch
                      checked={statements.includes(statement)}
                      onChange={() => toggleStatement(statement)}
                    />
                  }
                  sx={StatementRowSx}
                />
              ))}
            </FormGroup>
            {statements.includes("position") && (
              <Box marginTop="16px">
                <FieldLabel>Position addresses</FieldLabel>
                <TextField
                  disabled={formDisabled}
                  fullWidth
                  multiline
                  minRows={1}
                  maxRows={3}
                  size="medium"
                  value={addresses}
                  onChange={(event) => {
                    hasEditedAddresses.current = true
                    setAddresses(event.target.value)
                  }}
                  placeholder="0x… - separate multiple addresses with commas or spaces"
                  inputProps={{ "aria-label": "Position addresses" }}
                  sx={MultilineFieldSx}
                />
                <Typography
                  variant="text4"
                  component="p"
                  color={COLORS.santasGrey}
                  sx={{ marginTop: "6px", paddingX: "4px" }}
                >
                  No wallet connection or signature is required; positions are
                  public on chain.
                </Typography>
              </Box>
            )}
          </Box>

          <Box>
            <Box sx={FormatPeriodRowSx}>
              <Box>
                <FieldLabel>Statement format</FieldLabel>
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
              <Box>
                <FieldLabel>Statement period</FieldLabel>
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
              </Box>
            </Box>
            {dateSelection === "year" && (
              <Box marginTop="16px">
                <FieldLabel>Calendar year</FieldLabel>
                <TextField
                  disabled={formDisabled}
                  fullWidth
                  type="number"
                  size="medium"
                  value={calendarYear}
                  onChange={(event) => setCalendarYear(event.target.value)}
                  inputProps={{
                    "aria-label": "Calendar year",
                    min: 2020,
                    max: 9999,
                  }}
                />
              </Box>
            )}
            {dateSelection === "custom" && (
              <Box marginTop="16px">
                <DateRange
                  dates={customDates}
                  setDates={setCustomDates}
                  disabled={formDisabled}
                  calendar="popover"
                />
              </Box>
            )}
          </Box>

          {jobIsWorking && progress && (
            <ExportProgressTracker
              progress={progress}
              networkName={networkName}
            />
          )}
          {catalogError && <Notice tone="error">{catalogError}</Notice>}
          {error && <Notice tone="error">{error}</Notice>}
          {progress?.status === "failed" && (
            <Notice tone="error">
              {progress.error
                ? exportErrorMessage(progress.error)
                : "Export failed"}
            </Notice>
          )}
          {progress?.status === "cancelled" && (
            <Notice tone="info">Export cancelled.</Notice>
          )}
          {progress?.status === "completed" &&
            progress.downloadUrl &&
            (hasRequestChanges ? (
              <Notice tone="info">
                Your selections have changed. Generate an updated ZIP with the
                latest confirmed data, or download the existing ZIP unchanged.
              </Notice>
            ) : (
              <Notice tone="success">
                Your export is ready. Download it, or generate a fresh ZIP from
                the latest confirmed block.
              </Notice>
            ))}
        </Stack>
      </Box>

      <Box sx={FooterSx}>
        {dialogActions}
        {jobRequest && progress?.status === "completed" && (
          <Typography
            variant="text4"
            component="p"
            color={COLORS.santasGrey}
            textAlign="center"
          >
            Existing export: block {jobRequest.snapshotBlock}
            {exportedAt && ` · Data as of ${exportedAt} UTC`}
          </Typography>
        )}
      </Box>
    </Dialog>
  )
}
