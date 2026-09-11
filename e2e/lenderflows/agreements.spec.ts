import { encodeFunctionData, formatUnits, parseAbi, parseUnits } from "viem"

import * as chain from "../lib/chain"
import {
  ANVIL_ACCOUNTS,
  APP_URL,
  dbExec,
  faucet,
  gql,
  pins,
  rpc,
  syncSubgraph,
  type Address,
} from "../lib/env"
import { ensureConnected } from "../lib/page"
import { attachAgreement, step } from "../lib/step"
import * as subgraph from "../lib/subgraph"
import { expect, test, type Page } from "../lib/test"

/**
 * UAT lender flows — ToU / privacy / MLA agreements (LEN-01, LEN-02, LEN-03, LEN-04, LEN-13, LEN-14).
 * Runsheet: wildcat-uat/runsheet/uat_5 Lender Flows.tsv.
 *
 * All agreement signatures here are personal_sign ceremonies through the Local Anvil connector
 * (anvil holds the keys and signs for real; the API routes verify the signatures).
 *
 * IMPORTANT — wall clock, not chain clock: the ToU / MLA / no-MLA API routes bound the client's
 * timeSigned against the SERVER's wall clock (max 5 min in the future). Other harness specs time
 * travel the fork, so chain time can be far ahead of wall time; aligning the browser clock to the
 * chain (lib/page.gotoMarket) would make every signature submission a guaranteed 400. These flows
 * have no chain-time-gated UI, so plain page.goto (browser wall clock) is used throughout.
 */

const CHAIN_ID = 11155111
const account = ANVIL_ACCOUNTS[0] as Address
const ADDR = account.toLowerCase()
// pins.markets is typed narrowly in lib/env; the harness pin file also carries mla/noMla.
const pinnedMarkets = (
  pins as unknown as { markets: { mla: string; noMla: string } }
).markets
const MLA_MARKET = pinnedMarkets.mla.toLowerCase() as Address
const NO_MLA_MARKET = pinnedMarkets.noMla.toLowerCase() as Address
// Landing page used only to open the connect dialog (agreement pages redirect when disconnected;
// the lender home fans out lens reads for every market, which is a heavy cold-fork load).
const CONNECT_PAGE = `/lender/market/${pins.smoke.market.toLowerCase()}`

const CURRENT_TOU_VERSION = "terms-of-use-v2-2025-02-12"
const CURRENT_TOU_LABEL = "Version 2"
const LEGACY_TOU_VERSION = "terms-of-use-v1-2025-01-17"
const LEGACY_TOU_LABEL = "Version 1"

type SlaState = {
  party: string
  isSigned: boolean
  state: string
  currentVersion: { version: string; effectiveDate: string }
  acceptedVersion: { version: string } | null
}
const fetchSla = async (party: "Lender" | "Borrower"): Promise<SlaState> => {
  const res = await fetch(
    `${APP_URL}/api/sla/${account}?chainId=${CHAIN_ID}&party=${party}`,
  )
  expect(res.ok, `GET /api/sla ${party}: ${res.status}`).toBe(true)
  return res.json()
}

const dbCount = (sql: string) => Number(dbExec(sql).trim())

/** Remove every lender ToU record for account #0 (versioned rows, legacy dual-write, refusals). */
const clearLenderToU = () => {
  dbExec(
    `delete from "ServiceAgreementSignature" where lower(address)='${ADDR}' and party='Lender'`,
  )
  dbExec(
    `delete from "ServiceAgreementRefusal" where lower(address)='${ADDR}' and party='Lender'`,
  )
  dbExec(
    `delete from "LenderServiceAgreementSignature" where lower(signer)='${ADDR}'`,
  )
}

const SEEDED_MARKER = "e2e-seeded-legacy-acceptance"
/** Fabricate an acceptance of the older ToU version (the gate checks row existence, not the sig). */
const seedLegacyAcceptance = () => {
  dbExec(
    `insert into "ServiceAgreementSignature"
       ("chainId", address, signer, party, "serviceAgreementId", signature, "timeSigned", "signedMessage")
     select ${CHAIN_ID}, '${ADDR}', '${ADDR}', 'Lender', id, '${SEEDED_MARKER}', now() - interval '30 days', 'e2e seeded legacy acceptance (LEN-02)'
     from "ServiceAgreement" where version = '${LEGACY_TOU_VERSION}'`,
  )
}

/** Open a page that has the app footer and connect the Local Anvil wallet. */
const connectOnMarketPage = async (page: Page, market: string = "") => {
  await page.goto(market ? `/lender/market/${market}` : CONNECT_PAGE)
  await ensureConnected(page, account)
}

/** Drive the deposit dialog (already open) through gate checkbox → amount → approve → deposit. */
const completeDepositDialog = async (page: Page, units: bigint) => {
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible({ timeout: 30_000 })
  // Borrower-history gate (only for some markets) renders before the amount form.
  const gate = dialog.getByRole("checkbox")
  const textbox = dialog.getByRole("textbox").first()
  await expect(textbox.or(gate.first()).first()).toBeVisible({
    timeout: 30_000,
  })
  if (await gate.count()) {
    await gate.first().check()
    await dialog
      .getByRole("button", { name: /deposit anyway|continue/i })
      .click()
  }
  await textbox.fill(units.toString())
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
}

/** Units that clear the market's minimum-deposit hook (minimum + 1 whole token, else 100). */
const depositUnitsFor = (m: {
  asset: { decimals: number }
  hooksConfig: { minimumDeposit: string | null } | null
}) => {
  const minimum = BigInt(m.hooksConfig?.minimumDeposit ?? "0")
  let units = 100n
  if (parseUnits(units.toString(), m.asset.decimals) <= minimum) {
    units = BigInt(formatUnits(minimum, m.asset.decimals).split(".")[0]) + 1n
  }
  return units
}

test.describe.serial("lender flows: ToU / privacy / MLA agreements", () => {
  // Safety net: other specs rely on account #0 holding a CURRENT ToU acceptance. If a failure
  // aborts the serial chain between the fixture delete and the re-sign, restore a synthetic
  // acceptance (the gate checks row existence, not signature validity).
  test.afterAll(async () => {
    const { state } = await fetchSla("Lender")
    if (state !== "signedCurrent") {
      dbExec(
        `insert into "ServiceAgreementSignature"
           ("chainId", address, signer, party, "serviceAgreementId", signature, "timeSigned", "signedMessage")
         select ${CHAIN_ID}, '${ADDR}', '${ADDR}', 'Lender', id, '0xe2e-restored-current-acceptance', now(), 'e2e afterAll restore'
         from "ServiceAgreement" where "isCurrent"
         on conflict do nothing`,
      )
    }
  })

  test("LEN-01: fresh wallet signs the ToU; version shown; download; state persists", async ({
    page,
  }) => {
    await step(
      page,
      "clear #0's lender acceptance (fresh-wallet fixture)",
      async () => {
        clearLenderToU()
        const sla = await fetchSla("Lender")
        expect(sla.state).toBe("neverSigned")
        expect(sla.isSigned).toBe(false)
      },
    )

    await step(page, "connect and open /lender/agreement", async () => {
      await connectOnMarketPage(page)
      await page.goto("/lender/agreement")
      await expect(page.getByText("Wildcat Terms Of Use")).toBeVisible({
        timeout: 30_000,
      })
    })

    await step(
      page,
      "current version is displayed next to the title",
      async () => {
        await expect(page.getByText(CURRENT_TOU_LABEL).first()).toBeVisible({
          timeout: 30_000,
        })
      },
    )

    await step(page, "sign the Terms of Use (personal_sign)", async () => {
      const sign = page.getByRole("button", { name: /^sign/i })
      await expect(sign).toBeVisible({ timeout: 30_000 })
      await sign.click()
      await expect(sign).toBeHidden({ timeout: 60_000 })
      await expect
        .poll(async () => (await fetchSla("Lender")).state, {
          timeout: 30_000,
        })
        .toBe("signedCurrent")
    })

    const sla = await fetchSla("Lender")
    attachAgreement("LEN-01 ToU state after signing", {
      api: sla,
      pageVersionChip: CURRENT_TOU_LABEL,
      expectedVersion: CURRENT_TOU_VERSION,
    })
    expect(sla.acceptedVersion?.version).toBe(CURRENT_TOU_VERSION)
    // Old-table dual-write keeps the legacy lender record in sync.
    expect(
      dbCount(
        `select count(*) from "LenderServiceAgreementSignature" where lower(signer)='${ADDR}'`,
      ),
    ).toBeGreaterThanOrEqual(1)

    await step(page, "document downloads from the agreement page", async () => {
      // Signing navigates back; return to the agreement page in review mode.
      await page.goto("/lender/agreement")
      // Upstream a5700145 replaced the Download BUTTON with a native download LINK.
      await expect(
        page
          .getByRole("link", { name: /download/i })
          .or(page.getByRole("button", { name: /^download$/i }))
          .first(),
      ).toBeVisible({ timeout: 30_000 })
      const res = await fetch(
        `${APP_URL}/api/service-agreement/current/download`,
      )
      expect(res.status).toBe(200)
      expect((await res.text()).length).toBeGreaterThan(1000)
    })

    await step(
      page,
      "state persists across a reload (review mode)",
      async () => {
        await page.reload()
        await expect(page.getByText("Wildcat Terms Of Use")).toBeVisible({
          timeout: 30_000,
        })
        // Review mode: Cancel + Download, no Sign button (acceptance is final for this version).
        await expect(
          page.getByRole("button", { name: /^cancel$/i }),
        ).toBeVisible({ timeout: 30_000 })
        await expect(
          page.getByRole("button", { name: /^sign and continue$/i }),
        ).toHaveCount(0)
        expect((await fetchSla("Lender")).state).toBe("signedCurrent")
      },
    )
  })

  test("LEN-02: legacy signer sees both versions in the re-sign prompt and updates to current", async ({
    page,
  }) => {
    await step(
      page,
      "seed a legacy (Version 1) acceptance for #0",
      async () => {
        clearLenderToU()
        seedLegacyAcceptance()
        const sla = await fetchSla("Lender")
        expect(sla.state).toBe("stale") // older version accepted, no re-acceptance campaign active
        expect(sla.acceptedVersion?.version).toBe(LEGACY_TOU_VERSION)
        attachAgreement("LEN-02 seeded legacy state", { api: sla })
      },
    )

    await connectOnMarketPage(page)

    const dialog = page.getByRole("dialog")
    await step(page, "open the ToU status prompt from the footer", async () => {
      await page.getByRole("button", { name: "Terms of Use status" }).click()
      await expect(dialog).toBeVisible({ timeout: 30_000 })
      await expect(dialog.getByText("Updated Terms of Use")).toBeVisible()
    })

    await step(
      page,
      "both versions are shown; no bogus invitation path",
      async () => {
        await expect(
          dialog.getByText(`Signed ${LEGACY_TOU_LABEL}`),
        ).toBeVisible()
        await expect(dialog.getByText(`New ${CURRENT_TOU_LABEL}`)).toBeVisible()
        // View Terms control is present alongside the version rows.
        await expect(dialog.getByText("View full terms")).toBeVisible()
        // "No bogus 'complete invitation' path": the lender re-sign prompt must never route to
        // the borrower invitation flow.
        await expect(dialog.getByText(/complete.*invitation/i)).toHaveCount(0)
        attachAgreement("LEN-02 re-sign prompt", {
          signedRow: `Signed ${LEGACY_TOU_LABEL}`,
          newRow: `New ${CURRENT_TOU_LABEL}`,
        })
      },
    )

    await step(page, "sign the new version from the prompt", async () => {
      await dialog.getByRole("button", { name: /^sign terms of use$/i }).click()
      await expect
        .poll(async () => (await fetchSla("Lender")).state, {
          timeout: 60_000,
        })
        .toBe("signedCurrent")
    })

    await step(
      page,
      "prompt flips to the up-to-date confirmation",
      async () => {
        await expect(
          dialog.getByText(`Signed ${CURRENT_TOU_LABEL}`),
        ).toBeVisible({ timeout: 30_000 })
        await expect(dialog.getByText(/up to date/i)).toBeVisible()
        await dialog.getByRole("button", { name: /^close$/i }).click()
        await expect(dialog).toBeHidden({ timeout: 15_000 })
      },
    )

    const sla = await fetchSla("Lender")
    expect(sla.acceptedVersion?.version).toBe(CURRENT_TOU_VERSION)
    attachAgreement("LEN-02 ToU state after re-sign", { api: sla })
    // Tidy up the fabricated legacy row; the real current acceptance remains.
    dbExec(
      `delete from "ServiceAgreementSignature" where signature='${SEEDED_MARKER}'`,
    )
  })

  test("LEN-03: ToU state across lender/borrower sides is capacity-scoped and never traps", async ({
    page,
  }) => {
    // The gate is capacity-scoped by design: the same wallet has independent Lender and
    // Borrower records. #0 signed as Lender (LEN-02) and is not a registered borrower.
    const lenderBefore = await fetchSla("Lender")
    const borrowerBefore = await fetchSla("Borrower")
    expect(lenderBefore.state).toBe("signedCurrent")
    expect(borrowerBefore.state).toBe("neverSigned")
    attachAgreement("LEN-03 per-side ToU state (before toggling)", {
      lender: lenderBefore,
      borrower: borrowerBefore,
    })

    await connectOnMarketPage(page)

    await step(page, "toggle to the borrower side via the header", async () => {
      await page.getByRole("link", { name: "Borrower" }).click()
      await page.waitForURL(/\/borrower/, { timeout: 30_000 })
    })

    const dialog = page.getByRole("dialog")
    await step(
      page,
      "borrower side: first-acceptance prompt appears and is dismissible (not a trap)",
      async () => {
        // Actual behavior: no redirect for a non-borrower wallet; the borrower home renders and
        // the ToU prompt auto-opens for the unsigned Borrower capacity, offering a signature —
        // NOT the borrower-invitation dead end (no invitation is pending for #0).
        await expect(
          dialog.getByText("Terms of Use Signature Required"),
        ).toBeVisible({ timeout: 60_000 })
        await expect(
          dialog.getByRole("button", { name: /^sign terms of use$/i }),
        ).toBeVisible()
        await expect(dialog.getByText(/complete.*invitation/i)).toHaveCount(0)
        // Dismissible: the borrower is never stuck behind an unsatisfiable prompt.
        await page.keyboard.press("Escape")
        await expect(dialog).toBeHidden({ timeout: 15_000 })
      },
    )

    await step(page, "toggle back to the lender side: no prompt", async () => {
      await page.getByRole("link", { name: "Lender" }).click()
      await page.waitForURL(/\/lender/, { timeout: 30_000 })
      await ensureConnected(page, account)
      // signedCurrent as Lender: the re-acceptance prompt must not auto-open.
      await expect(page.getByText("Updated Terms of Use")).toHaveCount(0)
      await expect(
        page.getByText("Terms of Use Signature Required"),
      ).toHaveCount(0)
    })

    const lenderAfter = await fetchSla("Lender")
    const borrowerAfter = await fetchSla("Borrower")
    // Toggling sides changes nothing: both capacities keep their own state.
    expect(lenderAfter.state).toBe("signedCurrent")
    expect(borrowerAfter.state).toBe("neverSigned")
    attachAgreement("LEN-03 per-side ToU state (after toggling)", {
      lender: lenderAfter,
      borrower: borrowerAfter,
      note: "Capacity-scoped by design; borrower side offers its own signature and is dismissible.",
    })
  })

  test("LEN-04: privacy policy opens from the footer link", async ({
    page,
  }) => {
    // There is no separate privacy-policy signature in this app: the ToU acceptance (LEN-01)
    // is the only signature ceremony; the privacy policy is a document linked from the footer.
    await connectOnMarketPage(page)

    const link = page.locator(
      'a[href="https://docs.wildcat.finance/legal/protocol-ui-privacy-policy"]',
    )
    await step(page, "footer link points at the privacy policy", async () => {
      await expect(link).toBeVisible({ timeout: 30_000 })
      await expect(link).toHaveAttribute("target", "_blank")
      await expect(link.getByText("Privacy Policy")).toBeVisible()
    })

    await step(page, "clicking opens the document in a new tab", async () => {
      const popupPromise = page.waitForEvent("popup", { timeout: 30_000 })
      // The next-dev overlay badge (<nextjs-portal>) floats over the footer corner and
      // intercepts pointer events in dev mode; dispatch the click on the anchor itself.
      await link.dispatchEvent("click")
      const popup = await popupPromise
      // The external site may be unreachable from the harness; the committed URL is the oracle.
      await popup.waitForLoadState("domcontentloaded").catch(() => undefined)
      expect(popup.url()).toContain("protocol-ui-privacy-policy")
      attachAgreement("LEN-04 privacy policy link", {
        href: "https://docs.wildcat.finance/legal/protocol-ui-privacy-policy",
        target: "_blank",
        popupUrl: popup.url(),
      })
      await popup.close()
    })
  })

  test("LEN-13: MLA market — deposit gated until the MLA is countersigned; signed MLA downloadable", async ({
    page,
  }) => {
    const m = await subgraph.market(MLA_MARKET)
    expect(m, "pinned MLA market exists on the fork subgraph").not.toBeNull()
    const units = depositUnitsFor(m!)
    const token = m!.asset.address as Address

    await step(
      page,
      "fixtures: fresh MLA state, funds, lender access",
      async () => {
        // Idempotent reruns: drop any prior countersignature by #0 on this market.
        dbExec(
          `delete from "MlaSignature" where "chainId"=${CHAIN_ID} and lower(market)='${MLA_MARKET}' and lower(address)='${ADDR}'`,
        )
        faucet(account, parseUnits("1", 18))
        faucet(
          account,
          parseUnits(units.toString(), m!.asset.decimals) * 2n,
          token,
        )
        // The market's hooks require deposit access; grant it as the borrower (a push role
        // provider) via anvil impersonation — an ordinary transaction, no time travel.
        const q = await gql<{
          market: { borrower: string; hooks: { id: string } }
        }>(`{ market(id: "${MLA_MARKET}") { borrower hooks { id } } }`)
        const { borrower } = q.market
        const hooks = q.market.hooks.id
        const grantAbi = parseAbi([
          "function grantRole(address account, uint32 roleGrantedTimestamp)",
        ])
        const ts = await chain.blockTimestamp()
        await rpc("anvil_impersonateAccount", [borrower])
        await rpc("anvil_setBalance", [borrower, "0x8AC7230489E80000"]) // 10 ETH for gas
        const hash = await rpc<`0x${string}`>("eth_sendTransaction", [
          {
            from: borrower,
            to: hooks,
            gas: "0x4C4B40",
            data: encodeFunctionData({
              abi: grantAbi,
              functionName: "grantRole",
              args: [account, ts],
            }),
          },
        ])
        const receipt = await chain.publicClient.waitForTransactionReceipt({
          hash,
        })
        expect(receipt.status).toBe("success")
        await rpc("anvil_stopImpersonatingAccount", [borrower])
        await syncSubgraph()
      },
    )

    await connectOnMarketPage(page, MLA_MARKET)

    await step(
      page,
      "deposit is blocked behind the MLA signature gate",
      async () => {
        await expect(
          page.getByText("Loan Agreement Signature Required"),
        ).toBeVisible({ timeout: 60_000 })
        await expect(
          page.getByText("Sign the MLA before depositing into this market."),
        ).toBeVisible()
        // The deposit action is withheld entirely while the gate is up.
        await expect(
          page.getByRole("button", { name: /^deposit$/i }),
        ).toHaveCount(0)
      },
    )

    await step(page, "countersign the MLA (personal_sign)", async () => {
      await page.getByRole("button", { name: "View/Sign MLA" }).click()
      const signButton = page.getByRole("button", { name: /^sign mla$/i })
      await expect(signButton).toBeVisible({ timeout: 60_000 })
      await signButton.click()
      // Success: the sign control is replaced by the executed-MLA download controls.
      await expect(
        page.getByRole("button", { name: "Download Signed MLA" }),
      ).toBeVisible({ timeout: 60_000 })
      await expect(
        page.getByRole("button", { name: "Download PDF" }),
      ).toBeVisible()
    })

    await step(page, "executed MLA is recorded and downloadable", async () => {
      expect(
        dbCount(
          `select count(*) from "MlaSignature" where "chainId"=${CHAIN_ID} and lower(market)='${MLA_MARKET}' and lower(address)='${ADDR}'`,
        ),
      ).toBe(1)
      const signed = await fetch(
        `${APP_URL}/api/mla/${MLA_MARKET}/${ADDR}/signed?chainId=${CHAIN_ID}`,
      )
      expect(signed.status).toBe(200)
      attachAgreement("LEN-13 executed MLA", {
        market: MLA_MARKET,
        lender: ADDR,
        signedEndpointStatus: signed.status,
        dbRow: "MlaSignature present",
      })
    })

    await step(page, "deposit unblocks and completes", async () => {
      await page.keyboard.press("Escape") // close the MLA modal
      const balanceBefore = await chain.marketBalance(MLA_MARKET, account)
      const deposit = page.getByRole("button", { name: /^deposit$/i }).first()
      await expect(deposit).toBeVisible({ timeout: 60_000 })
      await deposit.click()
      await completeDepositDialog(page, units)
      await syncSubgraph()
      const balanceAfter = await chain.marketBalance(MLA_MARKET, account)
      expect(balanceAfter > balanceBefore, "market balance increased").toBe(
        true,
      )
    })
  })

  test("LEN-14: no-MLA market — first deposit requires the acknowledgement; recorded; deposit proceeds", async ({
    page,
  }) => {
    const m = await subgraph.market(NO_MLA_MARKET)
    expect(m, "pinned no-MLA market exists on the fork subgraph").not.toBeNull()
    const units = depositUnitsFor(m!)
    const token = m!.asset.address as Address

    await step(
      page,
      "fixtures: fresh acknowledgement state and funds",
      async () => {
        dbExec(
          `delete from "NonMlaAcknowledgement" where "chainId"=${CHAIN_ID} and lower(market)='${NO_MLA_MARKET}' and lower(address)='${ADDR}'`,
        )
        // The acknowledgement text embeds the borrower's legal name; the harness DB snapshot has
        // no profile for this market's borrower, which blocks the flow on both client and server.
        // Seed a minimal profile (fixture only — no app code involved).
        const borrower = m!
          ? (
              await gql<{ market: { borrower: string } }>(
                `{ market(id: "${NO_MLA_MARKET}") { borrower } }`,
              )
            ).market.borrower.toLowerCase()
          : ""
        dbExec(
          `insert into "Borrower" ("chainId", address, name, alias, "registeredOnChain", "removedFromArchController")
         select ${CHAIN_ID}, '${borrower}', 'E2E Fixture Borrower Ltd', 'E2E Fixture Borrower', true, false
         where not exists (select 1 from "Borrower" where "chainId"=${CHAIN_ID} and address='${borrower}')`,
        )
        faucet(account, parseUnits("1", 18))
        faucet(
          account,
          parseUnits(units.toString(), m!.asset.decimals) * 2n,
          token,
        )
      },
    )

    await connectOnMarketPage(page, NO_MLA_MARKET)

    await step(page, "market surfaces the borrower's MLA refusal", async () => {
      await expect(
        page.getByRole("button", { name: "Borrower Declined to Set An MLA" }),
      ).toBeVisible({ timeout: 60_000 })
    })

    const dialog = page.getByRole("dialog")
    await step(
      page,
      "first deposit attempt prompts the no-MLA acknowledgement",
      async () => {
        const deposit = page.getByRole("button", { name: /^deposit$/i }).first()
        await expect(deposit).toBeEnabled({ timeout: 60_000 })
        await deposit.click()
        await expect(
          dialog.getByText("No Master Loan Agreement", { exact: true }),
        ).toBeVisible({ timeout: 30_000 })
        await expect(
          dialog.getByText(
            "Sign this acknowledgement before opening the deposit window.",
          ),
        ).toBeVisible()
      },
    )

    await step(page, "sign the acknowledgement (personal_sign)", async () => {
      const acknowledge = dialog.getByRole("button", {
        name: /^acknowledge$/i,
      })
      await expect(acknowledge).toBeEnabled({ timeout: 60_000 })
      await acknowledge.click()
      // Recorded server-side, then the deposit dialog opens automatically.
      await expect
        .poll(
          () =>
            dbCount(
              `select count(*) from "NonMlaAcknowledgement" where "chainId"=${CHAIN_ID} and lower(market)='${NO_MLA_MARKET}' and lower(address)='${ADDR}'`,
            ),
          { timeout: 60_000 },
        )
        .toBe(1)
      const ackRes = await fetch(
        `${APP_URL}/api/mla/${NO_MLA_MARKET}/acknowledgement?chainId=${CHAIN_ID}&lenderAddress=${ADDR}`,
      )
      expect(ackRes.status).toBe(200)
      const ack = await ackRes.json()
      expect(ack, "acknowledgement visible through the API").not.toBeNull()
      attachAgreement("LEN-14 recorded acknowledgement", {
        market: NO_MLA_MARKET,
        lender: ADDR,
        acknowledgementTextVersion: ack?.acknowledgementTextVersion,
      })
    })

    await step(page, "deposit proceeds after acknowledging", async () => {
      const balanceBefore = await chain.marketBalance(NO_MLA_MARKET, account)
      // The deposit dialog auto-opens once the acknowledgement query refreshes.
      await completeDepositDialog(page, units)
      await syncSubgraph()
      const balanceAfter = await chain.marketBalance(NO_MLA_MARKET, account)
      expect(balanceAfter > balanceBefore, "market balance increased").toBe(
        true,
      )
    })

    await step(page, "no re-prompt on the next deposit attempt", async () => {
      await page.keyboard.press("Escape")
      await expect(dialog)
        .toBeHidden({ timeout: 15_000 })
        .catch(() => undefined)
      await page.reload()
      await ensureConnected(page, account)
      const deposit = page.getByRole("button", { name: /^deposit$/i }).first()
      await expect(deposit).toBeEnabled({ timeout: 60_000 })
      await deposit.click()
      // Straight to the deposit dialog: the acknowledgement is remembered.
      await expect(dialog).toBeVisible({ timeout: 30_000 })
      await expect(dialog.getByText("No Master Loan Agreement")).toHaveCount(0)
    })
  })
})
