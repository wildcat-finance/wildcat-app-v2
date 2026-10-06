// eslint-disable-next-line import/no-extraneous-dependencies
import { render, screen } from "@testing-library/react"

import { ExportProgressTracker } from "./ProgressTracker"

it("updates the work description, market context and percentage as the export advances", () => {
  const { rerender } = render(
    <ExportProgressTracker
      networkName="Sepolia"
      progress={{
        status: "running",
        progress: 18,
        phase: "reading_history_8_of_43",
      }}
    />,
  )
  expect(screen.getByText("Sepolia · Market 8 of 43")).toBeTruthy()
  expect(screen.getByRole("status").textContent).toContain(
    "Sepolia RPC nodes and Etherscan",
  )
  expect(screen.getByRole("status").textContent).toContain(
    "Fetching market history",
  )
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
    "18",
  )

  rerender(
    <ExportProgressTracker
      networkName="Sepolia"
      progress={{
        status: "running",
        progress: 19,
        phase: "checking_balances_8_of_43",
      }}
    />,
  )
  expect(screen.getByRole("status").textContent).toContain(
    "Comparing calculated totals with contract balances fetched through RPC",
  )

  rerender(
    <ExportProgressTracker
      networkName="Sepolia"
      progress={{ status: "running", progress: 94, phase: "creating_zip" }}
    />,
  )
  expect(screen.getByText("Packaging the ZIP")).toBeTruthy()
  expect(screen.queryByText(/Market 8 of 43/)).toBeNull()

  rerender(
    <ExportProgressTracker
      networkName="Sepolia"
      progress={{ status: "running", progress: 96, phase: "uploading_export" }}
    />,
  )
  expect(screen.getByRole("status").textContent).toContain(
    "Uploading your ZIP to Wildcat's export storage",
  )
})

it("explains shared waits and cached data without exposing internal phase names", () => {
  const { rerender } = render(
    <ExportProgressTracker
      networkName="Sepolia"
      progress={{
        status: "running",
        progress: 18,
        phase: "waiting_for_market_data_8_of_43",
      }}
    />,
  )
  expect(screen.getByRole("status").textContent).toContain(
    "Another export is processing this market",
  )
  rerender(
    <ExportProgressTracker
      networkName="Sepolia"
      progress={{
        status: "running",
        progress: 19,
        phase: "loading_cached_market_data_8_of_43",
      }}
    />,
  )
  expect(screen.getByRole("status").textContent).toContain(
    "Reusing verified market history",
  )
  expect(
    screen.queryByText(/waiting_for_market_data|loading_cached_market_data/),
  ).toBeNull()
})
