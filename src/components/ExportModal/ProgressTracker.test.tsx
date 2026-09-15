// eslint-disable-next-line import/no-extraneous-dependencies
import { render, screen } from "@testing-library/react"

import { ExportProgressTracker } from "./ProgressTracker"

it("updates the work description, market context and active stage as the export advances", () => {
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
    "Fetching on-chain history",
  )
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
    "18",
  )
  expect(
    screen.getByText("Build data").closest("li")?.getAttribute("aria-current"),
  ).toBe("step")

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
    "Reconciling the calculated history with on-chain",
  )

  rerender(
    <ExportProgressTracker
      networkName="Sepolia"
      progress={{ status: "running", progress: 94, phase: "creating_zip" }}
    />,
  )
  expect(screen.getByText("Packaging the ZIP")).toBeTruthy()
  expect(screen.queryByText(/Market 8 of 43/)).toBeNull()
  expect(
    screen
      .getByText("Create files")
      .closest("li")
      ?.getAttribute("aria-current"),
  ).toBe("step")

  rerender(
    <ExportProgressTracker
      networkName="Sepolia"
      progress={{ status: "running", progress: 96, phase: "uploading_export" }}
    />,
  )
  expect(screen.getByRole("status").textContent).toContain(
    "Uploading the finished export",
  )
  expect(
    screen.getByText("Save ZIP").closest("li")?.getAttribute("aria-current"),
  ).toBe("step")
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
    "Another export is building this market's data",
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
