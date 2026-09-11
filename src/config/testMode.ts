/**
 * Local test mode (fork harness). Enables the Local Anvil wallet connector and disables third-party
 * scripts. It changes nothing about product authentication.
 */
export const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "1"
