import { Box, LinearProgress, Stack, Typography } from "@mui/material"

import { ExportProgress } from "@/lib/export/types"
import { COLORS } from "@/theme/colors"

const phases: Record<string, { title: string; detail: string }> = {
  queued: {
    title: "Waiting to start",
    detail: "Your export is queued and will start automatically.",
  },
  discovering_markets: {
    title: "Checking selected markets",
    detail: "Reading market contract details from {network} RPC nodes.",
  },
  preparing_market_data: {
    title: "Preparing market history",
    detail:
      "Checking Wildcat's export storage for data saved at this snapshot.",
  },
  waiting_for_market_data: {
    title: "Waiting for shared market data",
    detail:
      "Another export is processing this market. Yours will reuse its results.",
  },
  reading_history: {
    title: "Fetching market history",
    detail:
      "Fetching market events and transfers from {network} RPC nodes and Etherscan.",
  },
  fetching_transactions: {
    title: "Fetching transaction details",
    detail:
      "Fetching transaction results and block timestamps from {network} RPC nodes.",
  },
  building_transactions: {
    title: "Calculating transaction history",
    detail:
      "Calculating deposits, repayments and withdrawals from the downloaded records.",
  },
  building_daily_history: {
    title: "Fetching daily balances",
    detail:
      "Reading historical contract balances from {network} archive RPC nodes for each day.",
  },
  checking_balances: {
    title: "Verifying market balances",
    detail:
      "Comparing calculated totals with contract balances fetched through RPC.",
  },
  finalizing_market_data: {
    title: "Calculating market summaries",
    detail:
      "Calculating interest, fees and late-payment periods from the downloaded records.",
  },
  loading_cached_market_data: {
    title: "Reusing verified market history",
    detail:
      "Loading this snapshot's verified data from Wildcat's export storage.",
  },
  saving_market_data: {
    title: "Saving verified market data",
    detail: "Uploading verified market data to Wildcat's export storage.",
  },
  market_complete: {
    title: "Market history ready",
    detail:
      "This market is verified and saved. Moving to the next export step.",
  },
  loading_market_data: {
    title: "Collecting verified market data",
    detail: "Loading the selected markets from Wildcat's export storage.",
  },
  building_position_data: {
    title: "Calculating lender positions",
    detail:
      "Reading wallet balances through RPC and calculating principal, earnings and withdrawals.",
  },
  preparing_bundle: {
    title: "Preparing export files",
    detail:
      "Building the CSV files and manifest from the verified market data.",
  },
  creating_statements: {
    title: "Creating statements",
    detail:
      "Generating your selected PDF or XLSX statements on the export server.",
  },
  creating_zip: {
    title: "Packaging the ZIP",
    detail: "Compressing the data files and statements into one ZIP.",
  },
  uploading_export: {
    title: "Saving your ZIP",
    detail: "Uploading your ZIP to Wildcat's export storage.",
  },
  finalizing: {
    title: "Preparing your download",
    detail: "Saving the download link for your completed ZIP.",
  },
}

const describeExportProgress = (phase = "queued") => {
  const match = phase.match(/^(.+)_(\d+)_of_(\d+)$/)
  const stage = match ? match[1] : phase
  return {
    ...(phases[stage] ?? {
      title: "Preparing the next step",
      detail: "The export worker is preparing the next stage.",
    }),
    market: match ? `Market ${match[2]} of ${match[3]}` : undefined,
  }
}

export const ExportProgressTracker = ({
  progress,
  networkName,
}: {
  progress: ExportProgress
  networkName: string
}) => {
  const { title, detail, market } = describeExportProgress(progress.phase)
  return (
    <Stack gap="6px" role="status" aria-live="polite" aria-atomic="true">
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="baseline"
        gap="12px"
      >
        <Typography fontSize="13px" fontWeight={500} color={COLORS.bunker}>
          {title}
        </Typography>
        <Typography
          fontSize="12px"
          color={COLORS.blackRock07}
          whiteSpace="nowrap"
        >
          {progress.progress}%
        </Typography>
      </Stack>
      <LinearProgress
        aria-label="Estimated export progress"
        aria-valuetext={`${progress.progress}% overall. ${title}${
          market ? `. ${market}` : ""
        }`}
        variant="determinate"
        value={progress.progress}
        sx={{
          height: "3px",
          backgroundColor: COLORS.whiteLilac,
          "& .MuiLinearProgress-bar": { backgroundColor: COLORS.blueRibbon },
        }}
      />
      <Box>
        <Typography
          fontSize="11px"
          lineHeight="16px"
          color={COLORS.blackRock07}
        >
          {networkName}
          {market ? ` · ${market}` : ""}
        </Typography>
        <Typography
          fontSize="12px"
          lineHeight="18px"
          color={COLORS.blackRock07}
        >
          {detail.replaceAll("{network}", networkName)}
        </Typography>
      </Box>
    </Stack>
  )
}
