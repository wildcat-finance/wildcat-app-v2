import {
  ANVIL_ACCOUNTS,
  anvilHead,
  gql,
  pins,
  rpc,
  sh,
  waitForSubgraphBlock,
} from "./fixtures"
import { expect, test, type Page } from "./lib/test"

type Asset = {
  address: string
  decimals: number
  symbol: string
  isMock: boolean
}
type MarketQ = {
  market: {
    id: string
    name: string
    totalDeposited: string
    asset: Asset
  } | null
}
type LenderQ = {
  lenderAccount: { totalDeposited: string; deposits: { id: string }[] } | null
  market: { totalDeposited: string }
}
const lenderQuery = (market: string, account: string) => `{
  lenderAccount(id: "LENDER-${market}-${account.toLowerCase()}") { totalDeposited deposits(first: 100) { id } }
  market(id: "${market}") { totalDeposited }
}`

const DEPOSIT_UNITS = 100n

/** In test mode the Local Anvil connector reports isAuthorized() and wagmi auto-reconnects on load.
 *  Wait for EITHER outcome before deciding — isVisible() returns immediately (timeout ignored),
 *  and an instant pre-hydration check misclassifies a connected page (lib/page.ts has the same
 *  fix; this is the spec's standalone copy). */
async function connectLocalAnvil(page: Page, account: string) {
  const shortAddress = new RegExp(
    `${account.slice(0, 6)}.*${account.slice(-4)}`,
    "i",
  )
  const connected = page.getByRole("button", { name: shortAddress })
  const connectCta = page.getByRole("button", { name: /connect wallet/i })
  await expect(connected.or(connectCta).first()).toBeVisible({
    timeout: 30_000,
  })
  // The CTA can vanish between the race and the click (auto-reconnect completing): bounded
  // click, and on interception/detachment re-check the connected chip instead of hanging.
  for (let attempt = 0; ; attempt += 1) {
    if (await connected.isVisible().catch(() => false)) return
    const clicked = await connectCta
      .first()
      .click({ timeout: 10_000 })
      .then(() => true)
      .catch(() => false)
    if (clicked) break
    if (attempt >= 2) {
      // An auto-opened dialog (ToU re-acceptance, KYB explainer) aria-hides the whole header:
      // role queries are blind to BOTH the chip and the CTA, but the chip's TEXT stays
      // findable — assert the address is rendered rather than hanging on roles.
      await expect(page.getByText(shortAddress).first()).toBeVisible({
        timeout: 30_000,
      })
      return
    }
  }
  await page.getByRole("button", { name: "Local Anvil" }).click()
  await expect(connected).toBeVisible({ timeout: 30_000 })
}

test.describe.serial("local fork harness smoke", () => {
  const account = ANVIL_ACCOUNTS[pins.smoke.account]
  const market = pins.smoke.market.toLowerCase()
  let asset: Asset
  let before: { deposits: number; total: bigint }

  test("stack is healthy and the pinned market exists", async () => {
    expect(pins.smoke.market, "pins.json smoke.market must be set").not.toBe(
      "unpinned",
    )
    const status = sh("status.sh")
    expect(status, status).not.toContain("FAIL")
    expect(await rpc<string>("eth_chainId")).toBe("0xaa36a7")
    const m = await gql<MarketQ>(
      `{ market(id: "${market}") { id name totalDeposited asset { address decimals symbol isMock } } }`,
    )
    expect(
      m.market,
      "pinned smoke market exists on the fork subgraph",
    ).not.toBeNull()
    asset = m.market!.asset
    const l = await gql<LenderQ>(lenderQuery(market, account))
    before = {
      deposits: l.lenderAccount?.deposits.length ?? 0,
      total: BigInt(l.market.totalDeposited),
    }
  })

  test("fund the anvil account with ETH and the market's underlying", async () => {
    sh("faucet.sh", account, "1000000000000000000")
    sh(
      "faucet.sh",
      account,
      asset.address,
      (10n ** BigInt(asset.decimals) * DEPOSIT_UNITS * 10n).toString(),
    )
  })

  test("connect and sign the lender terms through the real flow", async ({
    page,
  }) => {
    // The harness DB is disposable: clear any prior lender acceptance so the real signing flow runs.
    const addr = account.toLowerCase()
    sh(
      "db-exec.sh",
      `delete from "ServiceAgreementSignature" where lower(address)='${addr}' and party='Lender'`,
    )
    sh(
      "db-exec.sh",
      `delete from "LenderServiceAgreementSignature" where lower(signer)='${addr}'`,
    )
    const slaUrl = `http://127.0.0.1:3000/api/sla/${account}?chainId=11155111&party=Lender`
    expect((await (await fetch(slaUrl)).json()).state).toBe("neverSigned")

    // Connect on the market page (the home page fans out lens reads for every market, which is a heavy cold-fork load);
    // the agreement page redirects home when no wallet is connected.
    await page.goto(`/lender/market/${market}`)
    await connectLocalAnvil(page, account)
    await page.goto("/lender/agreement") // wagmi reconnects from cookie storage on reload
    // Lender ToU: the app requests a personal_sign; anvil signs for its own account, the API verifies it.
    const sign = page.getByRole("button", { name: /^sign/i })
    await expect(sign).toBeVisible({ timeout: 30_000 })
    await sign.click()
    await expect(sign).toBeHidden({ timeout: 60_000 })
    await expect
      .poll(async () => (await (await fetch(slaUrl)).json()).state, {
        timeout: 30_000,
      })
      .toBe("signedCurrent")
  })

  test("deposit through the UI and verify chain, subgraph and UI", async ({
    page,
  }) => {
    await page.goto(`/lender/market/${market}`)
    await connectLocalAnvil(page, account)

    await page
      .getByRole("button", { name: /^deposit$/i })
      .first()
      .click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 30_000 })

    // Borrower-history gate FIRST: it fronts the amount form entirely (no textbox exists until
    // it is passed), and it is time-dependent — the pinned borrower's unhonoured batch ages past
    // the 30-day threshold as real days pass, so it can appear on a market that had none before.
    const textbox = dialog.getByRole("textbox").first()
    const gate = dialog.getByRole("checkbox")
    await expect(textbox.or(gate).first()).toBeVisible({ timeout: 30_000 })
    if (await gate.count()) {
      await gate.first().check()
      await dialog
        .getByRole("button", { name: /deposit anyway|continue/i })
        .click()
    }
    await textbox.fill(DEPOSIT_UNITS.toString())

    // Approve (if the allowance is insufficient) — wait for the button to become actionable, not just present.
    const approve = dialog.getByRole("button", { name: /^approve$/i })
    const deposit = dialog.getByRole("button", { name: /^deposit$/i })
    await expect(approve.or(deposit).first()).toBeEnabled({ timeout: 60_000 })
    if (await approve.count()) {
      await expect(approve).toBeEnabled({ timeout: 60_000 })
      await approve.click()
      await expect(
        dialog.getByRole("button", { name: /^approved$/i }),
      ).toBeVisible({ timeout: 90_000 })
    }
    await expect(deposit).toBeEnabled({ timeout: 60_000 })
    await deposit.click()
    await expect(page.getByText("Transaction Successful!")).toBeVisible({
      timeout: 120_000,
    })

    await rpc("anvil_mine", ["0x1"])
    const head = await anvilHead()
    await waitForSubgraphBlock(head)
    const after = await gql<LenderQ>(lenderQuery(market, account))
    expect(after.lenderAccount?.deposits.length).toBe(before.deposits + 1)
    expect(BigInt(after.market.totalDeposited) - before.total).toBe(
      10n ** BigInt(asset.decimals) * DEPOSIT_UNITS,
    )
  })
})
