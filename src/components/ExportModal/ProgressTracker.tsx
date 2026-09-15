import { Box, LinearProgress, Stack, Typography } from "@mui/material"

import { ExportProgress } from "@/lib/export/types"
import { COLORS } from "@/theme/colors"

const steps = ["Prepare", "Build data", "Create files", "Save ZIP"]
const phases: Record<string, { step: number; title: string; detail: string }> =
  {
    queued: {
      step: 0,
      title: "Waiting to start",
      detail:
        "Your export is queued. We will check the selected markets before reading their history.",
    },
    discovering_markets: {
      step: 0,
      title: "Checking selected markets",
      detail:
        "Reading on-chain market details and confirming which markets belong in this export.",
    },
    preparing_market_data: {
      step: 1,
      title: "Preparing market history",
      detail:
        "Checking for verified data we can reuse at this snapshot before fetching new history.",
    },
    waiting_for_market_data: {
      step: 1,
      title: "Waiting for shared market data",
      detail:
        "Another export is building this market's data. We will reuse it as soon as it is ready.",
    },
    reading_history: {
      step: 1,
      title: "Fetching on-chain history",
      detail:
        "Reading market events and token transfers, then cross-checking the blockchain and explorer records.",
    },
    fetching_transactions: {
      step: 1,
      title: "Fetching transaction details",
      detail:
        "Reading transaction receipts and block timestamps to reconstruct the market's activity.",
    },
    building_transactions: {
      step: 1,
      title: "Calculating transaction history",
      detail:
        "Decoding events and calculating deposits, repayments, withdrawals and other asset movements.",
    },
    building_daily_history: {
      step: 1,
      title: "Reading daily on-chain balances",
      detail:
        "Querying historical blockchain states and calculating daily balances, interest and fees.",
    },
    checking_balances: {
      step: 1,
      title: "Verifying market balances",
      detail:
        "Reconciling the calculated history with on-chain token balances, supply and withdrawal claims.",
    },
    finalizing_market_data: {
      step: 1,
      title: "Calculating market summaries",
      detail:
        "Preparing market totals, delinquency periods and the supporting audit data.",
    },
    loading_cached_market_data: {
      step: 1,
      title: "Reusing verified market history",
      detail:
        "Loading saved data for this exact snapshot and checking its integrity.",
    },
    saving_market_data: {
      step: 1,
      title: "Saving verified market data",
      detail:
        "Saving this market's data so the export can resume and other exports can reuse it.",
    },
    market_complete: {
      step: 1,
      title: "Market history ready",
      detail:
        "This market's data is verified and saved. Continuing with the remaining export work.",
    },
    loading_market_data: {
      step: 2,
      title: "Collecting verified market data",
      detail:
        "Loading the selected markets into the export and checking the saved files.",
    },
    building_position_data: {
      step: 2,
      title: "Calculating lender positions",
      detail:
        "Checking the entered addresses' balances and calculating principal, earnings and pending withdrawals.",
    },
    preparing_bundle: {
      step: 2,
      title: "Preparing export files",
      detail:
        "Organizing the CSV data pack, manifest and any selected statements.",
    },
    creating_statements: {
      step: 2,
      title: "Creating statements",
      detail:
        "Rendering the selected statements with their tables, summaries and accounting notes.",
    },
    creating_zip: {
      step: 2,
      title: "Packaging the ZIP",
      detail:
        "Combining the data pack and selected statements into one downloadable file.",
    },
    uploading_export: {
      step: 3,
      title: "Saving your ZIP",
      detail: "Uploading the finished export so it is available to download.",
    },
    finalizing: {
      step: 3,
      title: "Preparing your download",
      detail:
        "Recording the completed export and making its download link available.",
    },
  }

const describeExportProgress = (phase = "queued") => {
  const match = phase.match(/^(.+)_(\d+)_of_(\d+)$/)
  const stage = match ? match[1] : phase
  return {
    ...(phases[stage] ?? {
      step: 0,
      title: "Preparing the next step",
      detail:
        "Your export is running. Progress will update as each stage completes.",
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
  const { step, title, detail, market } = describeExportProgress(progress.phase)
  return (
    <Stack
      gap="12px"
      sx={{
        border: `1px solid ${COLORS.whiteLilac}`,
        borderRadius: "12px",
        backgroundColor: COLORS.hintOfRed,
        padding: "16px",
      }}
    >
      <Stack direction="row" justifyContent="space-between" gap="12px">
        <Typography fontSize="11px" color={COLORS.blackRock07}>
          {networkName}
          {market ? ` · ${market}` : ""}
        </Typography>
        <Typography
          fontSize="11px"
          color={COLORS.blackRock07}
          whiteSpace="nowrap"
        >
          {progress.progress}% overall
        </Typography>
      </Stack>
      <Box role="status" aria-live="polite" aria-atomic="true">
        <Typography fontSize="14px" fontWeight={600} color={COLORS.bunker}>
          {title}
        </Typography>
        <Typography
          fontSize="12px"
          lineHeight="18px"
          color={COLORS.blackRock07}
          sx={{ marginTop: "4px" }}
        >
          {detail}
        </Typography>
      </Box>
      <LinearProgress
        aria-label="Export progress"
        aria-valuetext={`${progress.progress}% overall. ${title}${
          market ? `. ${market}` : ""
        }`}
        variant="determinate"
        value={progress.progress}
        sx={{
          height: "5px",
          borderRadius: "4px",
          backgroundColor: COLORS.whiteLilac,
          "& .MuiLinearProgress-bar": { backgroundColor: COLORS.blueRibbon },
        }}
      />
      <Box
        component="ol"
        aria-label="Export stages"
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "8px",
          padding: 0,
          margin: 0,
          listStyle: "none",
        }}
      >
        {steps.map((label, index) => (
          <Box
            component="li"
            key={label}
            aria-current={index === step ? "step" : undefined}
            sx={{ color: index <= step ? COLORS.bunker : COLORS.santasGrey }}
          >
            <Typography fontSize="11px" fontWeight={index === step ? 600 : 400}>
              <Box
                component="span"
                aria-hidden="true"
                sx={{
                  color: index <= step ? COLORS.blueRibbon : COLORS.santasGrey,
                  marginRight: "4px",
                }}
              >
                {index < step ? "✓" : `${index + 1}.`}
              </Box>
              {label}
              {index < step && (
                <Box
                  component="span"
                  sx={{
                    position: "absolute",
                    width: "1px",
                    height: "1px",
                    overflow: "hidden",
                    clipPath: "inset(50%)",
                  }}
                >
                  {" "}
                  complete
                </Box>
              )}
            </Typography>
          </Box>
        ))}
      </Box>
      <Typography fontSize="11px" lineHeight="16px" color={COLORS.blackRock07}>
        Progress estimates work completed. You can close this dialog and return
        to the export in this tab.
      </Typography>
    </Stack>
  )
}
