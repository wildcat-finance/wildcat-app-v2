import { defineConfig } from "@playwright/test"

// Local Sepolia fork harness smoke. Requires harness/fork/.env; `npm run dev:fork` boots the stack + next dev.
export default defineConfig({
  testDir: "e2e",
  timeout: 240_000,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }], ["./e2e/lib/summaryReporter.ts"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    // Default: video only on failure. PW_VIDEO=on turns on video for EVERY test, so the report
    // can put a video on every row (a green board has nothing to pair otherwise).
    video:
      (process.env.PW_VIDEO as "on" | "retain-on-failure" | undefined) ??
      "retain-on-failure",
  },
  webServer: {
    command: "npm run dev:fork",
    url: "http://127.0.0.1:3000",
    timeout: 900_000,
    reuseExistingServer: true,
  },
  // Board ordering: the "fixtures" stage deploys the shared borrower-#3 market/policy set every
  // other suite discovers by shape, and must run exactly once, first. It is now FAST, chain-side
  // factory provisioning (e2e/provision.setup.ts → e2e/lib/provision.ts) rather than the
  // ~20-minute create-market WIZARD replay. The fixtures project's own testMatch is what makes
  // provision.setup.ts run (it does not match Playwright's default .spec/.test testMatch, so the
  // board project never picks it up). market-creation.spec.ts (MKT-01…24) still runs — as
  // coverage — inside "board"; it deploys its OWN run-stamped scratch markets and tolerates the
  // pre-provisioned ones (its before-set diffing excludes them). See e2e/FIXTURE-MANIFEST.md.
  // Iterating on ONE suite against an already-fixtured fork: add --no-deps (the provisioner is
  // idempotent, but --no-deps skips the ~1-2 minute fixtures stage entirely).
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
})
