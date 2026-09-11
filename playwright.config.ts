import { defineConfig } from "@playwright/test"

import { APP_URL } from "./e2e/lib/env"

// Local Sepolia fork harness. Requires harness/fork/.env. The app URL comes from APP_URL, else harness/fork/pins.json (.app.url / .app.port, :3001 for this variant).
// `npm run dev:fork` attaches to the already-running stack and starts next dev on that port.
export default defineConfig({
  testDir: "e2e",
  timeout: 240_000,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["./e2e/lib/summaryReporter.ts"],
  ],
  use: {
    baseURL: APP_URL,
    trace: "retain-on-failure",
    // Default: video only on failure. PW_VIDEO=on turns on video for EVERY test, so the report
    // can put a video on every row.
    video:
      (process.env.PW_VIDEO as "on" | "retain-on-failure" | undefined) ??
      "retain-on-failure",
  },
  // Board ordering: the "fixtures" stage registers borrower #3, seeds its profile and deploys a
  // small open-term set, all chain-side via the hooks factory (e2e/provision.setup.ts →
  // e2e/lib/provision.ts) — fast, in place of the create-market WIZARD replay. market-creation.
  // spec.ts (MKT-01…24, mostly v2.5-gated on main) still runs as coverage inside "board". On main
  // the downstream suites discover from the impersonated pre-fork borrower + pinned markets, so
  // this stage is deliberately minimal (ported from the v2.5 worktree). See e2e/FIXTURE-MANIFEST.md.
  // Iterate on one suite with --no-deps.
  projects: [
    {
      name: "fixtures",
      testMatch: /provision\.setup\.ts/,
    },
    {
      name: "board",
      testIgnore: /provision\.setup\.ts/,
      dependencies: ["fixtures"],
    },
  ],
  webServer: {
    command: "npm run dev:fork",
    url: APP_URL,
    timeout: 900_000,
    reuseExistingServer: true,
  },
})
