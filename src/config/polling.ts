// Test mode (NEXT_PUBLIC_TEST_MODE=1, the local fork harness): the E2E suites act, then wait
// for the UI to reflect chain/subgraph state; the production cadence turns every one of those
// waits into idle seconds. Production cadence is unchanged.
const TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "1"

export const POLLING_INTERVAL = TEST_MODE ? 2_000 : 10_000

/** Subgraph-indexed account views (slowest production cadence in the app). */
export const INDEXED_POLLING_INTERVAL = TEST_MODE ? 3_000 : 60_000
