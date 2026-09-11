/* eslint-disable no-restricted-syntax, no-await-in-loop, import/no-extraneous-dependencies, no-nested-ternary, no-empty-pattern, prefer-destructuring */
import { execFileSync, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { join, relative, resolve } from "node:path"

import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter"

import { FORK_RPC, pins } from "./env"
import { buildAddressBook, enrichTransactions } from "./txDecode"
import {
  assignPages,
  attributeDidNotRun,
  deriveOutcome,
  parseUatId,
  runsheetPageOf,
  type Outcome,
  type RunMeta,
  type UatAnnotation,
  type UatJournalEntry,
  type UatRun,
  type UatTest,
} from "./uatModel"
import { renderUatReport, browserIdleSeconds } from "./uatReport"

type JournalEntry = UatJournalEntry

type TestRecord = {
  title: string
  status: string
  expectedStatus?: string
  outcome: Outcome
  durationMs: number
  error?: string
  journal: JournalEntry[]
  screenshots: string[]
  failureShot?: string
  failureState?: unknown
  video?: string
  agreements: { name: string; json: unknown }[]
}

const UAT_DIR = "uat-report"
const ASSET_DIR = join(UAT_DIR, "assets")

/** Repo root — the reporter must work from any cwd and from either branch's worktree. */
const REPO = resolve(__dirname, "../..")

/** pins.json shape the reporter needs. Re-typed locally so neither branch's env.ts changes. */
const PINS = pins as unknown as {
  forkBlock: number
  subgraph?: { primaryName?: string; primaryDeployment?: string }
}

const git = (...args: string[]): string => {
  try {
    return execFileSync("git", args, {
      cwd: REPO,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return ""
  }
}

const readIfExists = (p: string): string | undefined => {
  try {
    return existsSync(p) ? readFileSync(p, "utf8") : undefined
  } catch {
    return undefined
  }
}

/** Chain head + how far the fork clock leads wall time (KNOWN-ISSUES H1: it is one-way).
 *  Best effort: a board run against a down fork still gets a report, just without the lead. */
const chainLead = async (): Promise<
  { block: number; leadSeconds: number } | undefined
> => {
  try {
    const r = await fetch(FORK_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBlockByNumber",
        params: ["latest", false],
      }),
      signal: AbortSignal.timeout(5_000),
    })
    const j = (await r.json()) as {
      result?: { number: string; timestamp: string }
    }
    if (!j.result) return undefined
    return {
      block: Number(BigInt(j.result.number)),
      leadSeconds:
        Number(BigInt(j.result.timestamp)) - Math.floor(Date.now() / 1000),
    }
  } catch {
    return undefined
  }
}

/**
 * Everything about the run that is fixed before the first test starts. `argv`, `mode` and
 * `archiveDir` are deliberately NOT here: they are process facts read in `onEnd`, where the tests
 * stub `process.argv`. Capturing argv in a field initializer would read jest's own argv, which is
 * a "targeted" invocation, and `expect(run.meta.mode).toBe("full")` could never pass.
 * This function shells out to git exactly once per run — `onBegin` no longer re-calls it.
 */
type ConstructionMeta = Omit<RunMeta, "argv" | "mode" | "archiveDir">

const staticMeta = (): ConstructionMeta => {
  const dirty = git("status", "--porcelain").split("\n").filter(Boolean).length
  const pkg = JSON.parse(readIfExists(join(REPO, "package.json")) ?? "{}") as {
    dependencies?: Record<string, string>
  }
  const pinsRaw = readIfExists(join(REPO, "harness", "fork", "pins.json")) ?? ""
  return {
    appCommit: git("rev-parse", "HEAD") || "unknown",
    appDirty: dirty > 0,
    appDirtyFiles: dirty,
    buildId: readIfExists(join(REPO, ".next", "BUILD_ID"))?.trim(),
    // The reporter's own NODE_ENV describes the Playwright process, not the app under test, so
    // it cannot stand in for build kind — leave it unset until an app-side signal exists.
    build: undefined,
    sdk: pkg.dependencies?.["@wildcatfi/wildcat-sdk"] ?? "unknown",
    subgraphName: PINS.subgraph?.primaryName ?? "unknown",
    subgraphDeployment: PINS.subgraph?.primaryDeployment ?? "unknown",
    forkBlock: PINS.forkBlock,
    pinsSha256: createHash("sha256").update(pinsRaw).digest("hex"),
    // pollingMs stays undefined in W2 — see the comment on RunMeta in uatModel.ts.
    testMode: process.env.NEXT_PUBLIC_TEST_MODE === "1",
    // Set by the `board`/`board:one` npm scripts once they confirm harness/fork/.env.fork was
    // applied to this process — see the comment on RunMeta.envApplied in uatModel.ts.
    envApplied: process.env.WILDCAT_ENV_FORK_APPLIED === "1",
    pwVideo: process.env.PW_VIDEO,
  }
}

/** Docs the report header renders (release blockers, untested rows) + the optional overlay
 *  inputs. All optional: a branch without a manifest or a second run renders the plain report. */
const renderInputs = () => ({
  knownIssuesMd: readIfExists(join(REPO, "e2e", "KNOWN-ISSUES.md")),
  coverageMd: readIfExists(join(REPO, "e2e", "COVERAGE.md")),
  otherRaw: process.env.UAT_OTHER_RUN
    ? readIfExists(process.env.UAT_OTHER_RUN)
    : undefined,
  manifestRaw: readIfExists(
    process.env.UAT_MANIFEST ?? join(REPO, "e2e", "COMPARISON-MANIFEST.json"),
  ),
})

const parseJson = (body?: Buffer): unknown => {
  try {
    return body ? JSON.parse(body.toString()) : undefined
  } catch {
    return undefined
  }
}

// eslint-disable-next-line no-control-regex
const stripAnsi = (s: string): string => s.replace(/\u001b\[[0-9;]*m/g, "")

const slug = (s: string): string =>
  s
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60)

/** "full" = the whole board — no positional test-file/dir argument, and no --grep/-g, and no
 *  --grep-invert other than the documented full-board exclusion `--grep-invert "BOP-14"`, which
 *  matches BOTH slow time-jump rows (BOP-14 and BOP-14b) by prefix
 *  (harness/fork/README.md). Anything else — a suite path, --grep, a different --grep-invert —
 *  targets specific tests, so the run is "targeted" and must never be mistaken for a full board
 *  by cross-run tooling. */
const runMode = (argv: string[]): "full" | "targeted" => {
  // argv is process.argv.slice(2): playwright's CLI puts the "test" subcommand first.
  const args = argv[0] === "test" ? argv.slice(1) : argv
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i]
    if (a === "--grep-invert") {
      if (args[i + 1] !== "BOP-14") return "targeted"
      i += 1
    } else if (a.startsWith("--grep-invert=")) {
      if (a.slice("--grep-invert=".length) !== "BOP-14") return "targeted"
    } else if (a === "--grep" || a === "-g" || a.startsWith("--grep=")) {
      return "targeted"
    } else if (!a.startsWith("-")) {
      return "targeted"
    }
  }
  return "full"
}

/**
 * Three artifacts per run:
 *  - uat-report/index.html   — self-contained instant-read report: failed tests get a hero card
 *    (final app screenshot + plain-language failure panel + step film-strip + reproduction
 *    timeline + tx table + embedded video), passed/skipped collapse to one line each. Assets
 *    (screenshots, videos) are copied under uat-report/assets so the file works offline.
 *  - playwright-summary.json — compact machine-readable summary (status, steps, journal, oracles);
 *  - playwright-report.md    — terminal-friendly text version, links to the HTML report.
 */
class SummaryReporter implements Reporter {
  private tests: TestRecord[] = []

  private uatTests: UatTest[] = []

  private pendingVideos: { src: string; dest: string }[] = []

  private meta: ConstructionMeta = staticMeta()

  private startProbe: Promise<void> = Promise.resolve()

  onBegin() {
    this.startProbe = chainLead().then((c) => {
      this.meta.chainBlockStart = c?.block
      this.meta.chainLeadSecondsStart = c?.leadSeconds
    })
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const attachment = (name: string) =>
      result.attachments.find((a) => a.name === name)
    // outcome "expected" on a failed test = a test.fail()-annotated KNOWN-BLOCKED case (e.g.
    // BOP-17b under KNOWN-ISSUES #20): keep its failure artifacts but let reports render it as
    // known-blocked rather than a board failure. An UNEXPECTED pass of such a test stays loud.
    const failed = result.status !== "passed" && result.status !== "skipped"
    const index = this.tests.length

    // step()/failure screenshots arrive as buffer attachments — materialize them under
    // uat-report/assets for FAILED tests (skipped for green tests to keep the report small).
    const materialize = (
      name: string,
      n: number | "failure",
      att?: { body?: Buffer; path?: string },
    ): string | undefined => {
      if (!att || (!att.body && !att.path)) return undefined
      mkdirSync(ASSET_DIR, { recursive: true })
      const file = join(
        ASSET_DIR,
        n === "failure"
          ? `t${index}-failure.png`
          : `t${index}-${n}-${slug(name)}.png`,
      )
      try {
        if (att.body) writeFileSync(file, att.body)
        else copyFileSync(att.path as string, file)
        return file
      } catch {
        return undefined
      }
    }

    // WHERE did it fail: in a step() checkpoint, between checkpoints, or before the first one
    // (setup/arrange — the behavior under test was never exercised).
    let failedDuring:
      | { kind: string; name?: string; index?: number }
      | undefined
    if (failed) {
      const flat: { title: string; error?: unknown }[] = []
      const walk = (steps: TestResult["steps"]) => {
        for (const st of steps) {
          if (st.category === "test.step")
            flat.push({ title: st.title, error: st.error })
          if (st.steps) walk(st.steps)
        }
      }
      walk(result.steps)
      const failing = flat.findIndex((st) => st.error)
      if (failing >= 0)
        failedDuring = {
          kind: "step",
          name: flat[failing].title,
          index: failing + 1,
        }
      else if (flat.length === 0) failedDuring = { kind: "arrange" }
      else
        failedDuring = {
          kind: "between",
          name: flat[flat.length - 1].title,
          index: flat.length,
        }
    }
    const stepShots: { name: string; file: string }[] = failed
      ? result.attachments
          .filter((a) => a.name.startsWith("step: ") && (a.body || a.path))
          .map((a, i) => {
            const name = a.name.slice("step: ".length)
            const file = materialize(name, i, a as { body?: Buffer })
            return file ? { name, file } : undefined
          })
          .filter((s): s is { name: string; file: string } => s !== undefined)
      : []

    const failureShot = failed
      ? materialize("failure", "failure", attachment("failure.png"))
      : undefined

    // Video files are finalized asynchronously — remember the path, copy in onEnd.
    // Present for every test under PW_VIDEO=on, so the report can put a video on every row;
    // otherwise only for failures under the default retain-on-failure.
    const videoPath = attachment("video")?.path
    const videoDest = videoPath
      ? join(ASSET_DIR, `t${index}-video.webm`)
      : undefined
    if (videoPath && videoDest)
      this.pendingVideos.push({ src: videoPath, dest: videoDest })

    const tracePath = failed ? attachment("trace")?.path : undefined

    const rawError = result.error?.message
      ? stripAnsi(result.error.message)
      : undefined
    const errorLines = rawError?.split("\n") ?? []
    const headIdx = errorLines.findIndex((l) => l.trim() !== "")
    const errorHead = headIdx >= 0 ? errorLines[headIdx].trim() : undefined
    const errorDetail =
      headIdx >= 0
        ? errorLines
            .slice(headIdx + 1)
            .join("\n")
            .trim() || undefined
        : undefined

    const journal = (parseJson(attachment("journal.json")?.body) ??
      []) as JournalEntry[]
    const failureState = parseJson(attachment("failure-state.json")?.body) as
      | Record<string, unknown>
      | undefined
    const agreements = result.attachments
      .filter((a) => a.name.startsWith("agreement:"))
      .map((a) => ({ name: a.name, json: parseJson(a.body) }))

    const titlePath = test.titlePath().slice(2)
    const outcome: Outcome = deriveOutcome({
      status: result.status,
      expectedStatus: test.expectedStatus,
      retry: result.retry,
    })
    this.tests.push({
      title: titlePath.join(" › "),
      status: result.status,
      expectedStatus: test.expectedStatus,
      outcome,
      durationMs: result.duration,
      error: rawError?.split("\n").slice(0, 6).join("\n"),
      journal,
      screenshots: stepShots.map((s) => s.file),
      failureShot,
      failureState,
      video: videoDest,
      agreements,
    })
    const annotations: UatAnnotation[] = test.annotations.map((a) => ({
      type: a.type,
      description: a.description,
    }))
    const shortTitle = titlePath[titlePath.length - 1] ?? test.title
    const uatId = parseUatId(shortTitle)
    this.uatTests.push({
      uatId,
      page: runsheetPageOf(uatId),
      title: shortTitle,
      file: relative(REPO, test.location.file),
      suite: titlePath.slice(0, -1).join(" › "),
      status: result.status,
      expectedStatus: test.expectedStatus,
      outcome,
      annotations,
      retry: result.retry,
      startedAt: result.startTime?.toISOString?.(),
      failedDuring,
      durationMs: result.duration,
      errorHead,
      errorDetail,
      errorStack: result.error?.stack
        ? stripAnsi(result.error.stack)
        : undefined,
      journal,
      // index.html lives inside uat-report/ — reference assets relatively.
      stepShots: stepShots.map((s) => ({
        name: s.name,
        file: relative(UAT_DIR, s.file),
      })),
      failureShot: failureShot ? relative(UAT_DIR, failureShot) : undefined,
      video: videoDest ? relative(UAT_DIR, videoDest) : undefined,
      tracePath,
      failureState,
      agreements,
    })
  }

  /** Detect the actual end of the blank/white lead by inverting the video and running
   *  blackdetect: the recording's internal timeline lags wall time by a few seconds, so the
   *  journal-computed idle alone under-trims. Returns seconds, or undefined when undetectable. */
  private static detectWhiteLeadSeconds(src: string): number | undefined {
    try {
      const r = spawnSync(
        "ffmpeg",
        // prettier-ignore
        [
          "-i", src,
          "-vf", "negate,blackdetect=d=1:pix_th=0.10",
          "-an", "-f", "null", "-",
        ],
        { encoding: "utf8", timeout: 180_000 },
      )
      // blackdetect logs to stderr: black_start:0 black_end:56.2 black_duration:56.2
      const m = /black_start:0(?:\.\d+)?\s+black_end:([\d.]+)/.exec(
        r.stderr ?? "",
      )
      const end = m ? Number(m[1]) : NaN
      return Number.isFinite(end) && end > 0 ? end : undefined
    } catch {
      return undefined
    }
  }

  /** Physically strip the chain-only white lead from a failed test's video. Re-encode (stream
   *  copy breaks VP8 starts); only failed tests carry videos, so the cost is a few seconds.
   *  Returns true when the trimmed file landed; any failure means "fall back to a plain copy". */
  private static trimVideoLead(
    src: string,
    dest: string,
    idleSeconds: number,
  ): boolean {
    try {
      execFileSync(
        "ffmpeg",
        // prettier-ignore
        [
          "-y", "-ss", String(idleSeconds), "-i", src,
          "-c:v", "libvpx", "-crf", "30", "-b:v", "0", "-an",
          dest,
        ],
        { stdio: "ignore", timeout: 180_000 },
      )
      return existsSync(dest) && statSync(dest).size > 0
    } catch {
      return false
    }
  }

  async onEnd(result: FullResult) {
    // List-only / empty runs (e.g. `playwright test --list`, or a --grep that matched nothing)
    // record no test — write NOTHING so they can never clobber the last real board's artefacts.
    if (this.tests.length === 0) {
      console.log(
        "[summaryReporter] no tests ran — skipping uat-report/ and uat-runs/ (nothing to write).",
      )
      return
    }
    for (const v of this.pendingVideos) {
      try {
        if (existsSync(v.src)) {
          mkdirSync(ASSET_DIR, { recursive: true })
          // Trim the browser-idle lead (>3s) off the copy; fall back to the untrimmed video
          // (the report then keeps its #t= start-offset fragment + idle note instead).
          const t = this.uatTests.find(
            (u) => u.video && join(UAT_DIR, u.video) === v.dest,
          )
          const idle = t ? browserIdleSeconds(t) : 0
          // The recording's internal clock lags wall time — detect the blank lead in the video
          // itself and prefer it (sanity-bounded by the journal idle) so no white frames remain.
          const detected =
            idle > 3 ? SummaryReporter.detectWhiteLeadSeconds(v.src) : undefined
          const lead =
            detected !== undefined && detected >= idle - 2
              ? Math.min(detected + 0.3, idle + 20)
              : idle
          if (
            lead > 3 &&
            t &&
            SummaryReporter.trimVideoLead(v.src, v.dest, lead)
          )
            t.videoTrimmedLeadSeconds = Math.round(lead)
          else copyFileSync(v.src, v.dest)
        }
      } catch {
        /* video missing — the report just omits it */
      }
    }
    const available = new Set(
      this.pendingVideos.filter((v) => existsSync(v.dest)).map((v) => v.dest),
    )
    for (const t of this.uatTests)
      if (t.video && !available.has(join(UAT_DIR, t.video))) t.video = undefined
    for (const t of this.tests)
      if (t.video && !available.has(t.video)) t.video = undefined

    // Report-time tx enrichment: names, decoded calls, human amounts. The address book talks
    // to the fork subgraph (guarded — offline it degrades to pinned names, and any failure
    // leaves the raw hash table). this.tests shares the journal arrays, so the enriched
    // fields land in playwright-summary.json too (old fields untouched).
    try {
      const book = await buildAddressBook()
      for (const t of this.uatTests) {
        const enriched = enrichTransactions(t.journal, book)
        let i = 0
        for (const e of t.journal)
          if (e.kind === "tx") {
            // Old-format entries (hash-only) carry nothing decodable — leave them
            // unenriched so the renderer keeps its raw hash table for them.
            if (e.to || e.functionName || e.input) e.enriched = enriched[i]
            i += 1
          }
      }
    } catch {
      /* enrichment is presentation only — never block the report */
    }

    await this.startProbe
    const end = await chainLead()
    this.meta.chainBlockEnd = end?.block
    this.meta.chainLeadSecondsEnd = end?.leadSeconds

    attributeDidNotRun(this.uatTests)
    assignPages(this.uatTests)
    // attributeDidNotRun mutates uatTests only, and this.tests (playwright-summary.json /
    // playwright-report.md) is index-aligned with it — both are pushed together, once per test, in
    // onTestEnd — so sync the relabel back onto it. Without this a serial-fallout row keeps its
    // original "skipped" outcome in the markdown/summary artefacts while run.json (and the HTML
    // report, which reads uatTests) correctly call it "did-not-run".
    this.uatTests.forEach((u, i) => {
      if (this.tests[i]) this.tests[i].outcome = u.outcome
    })

    // Pick the archive directory BEFORE writing anything, so run.json can name it and the
    // board check can print it. uat-runs/<startedAt>/ is never overwritten.
    const stamp = (
      result.startTime?.toISOString?.() ?? new Date().toISOString()
    ).replace(/[:.]/g, "-")
    let archiveDir = join("uat-runs", stamp)
    for (let n = 2; existsSync(archiveDir); n += 1)
      archiveDir = join("uat-runs", `${stamp}-${n}`)

    // argv/mode are read HERE, not at construction: the reporter is constructed before the tests
    // stub process.argv, and jest's own argv is a "targeted" invocation.
    const argv = process.argv.slice(2)
    const meta: RunMeta = {
      ...this.meta,
      argv,
      mode: runMode(argv),
      archiveDir,
    }

    const run: UatRun = {
      schema: "uat-run/2",
      status: result.status,
      startedAt: result.startTime?.toISOString?.(),
      durationMs: result.duration,
      meta,
      tests: this.uatTests,
    }

    // run.json BEFORE the HTML and the archive copy (recommendations §2: the machine-readable
    // artefact must survive a crash in rendering). The video-trim loop and the tx enrichment DO
    // still run before this point — the records name the trimmed files and carry the enriched
    // journal — but both are already wrapped in their own try/catch (summaryReporter.ts:327-356
    // and :368-385), so neither can stop run.json being written. Keep those catches.
    mkdirSync(UAT_DIR, { recursive: true })
    const runJson = join(UAT_DIR, "run.json")
    writeFileSync(
      `${runJson}.tmp`,
      JSON.stringify(run, (_k, v) => (typeof v === "bigint" ? String(v) : v)),
    )
    renameSync(`${runJson}.tmp`, runJson)

    const inputs = renderInputs()
    // run.json is already safely on disk above. Everything from here down can throw on input the
    // reporter does not control (a malformed UAT_OTHER_RUN or COMPARISON-MANIFEST.json, or a
    // renderer bug) — catch it so the run of record still gets archived instead of losing its
    // immutable copy to an exception thrown after run.json but before the archive copy.
    try {
      writeFileSync(
        join(UAT_DIR, "index.html"),
        renderUatReport(run, {
          knownIssuesMd: inputs.knownIssuesMd,
          coverageMd: inputs.coverageMd,
          other: inputs.otherRaw
            ? (JSON.parse(inputs.otherRaw) as UatRun)
            : null,
          manifest: inputs.manifestRaw ? JSON.parse(inputs.manifestRaw) : null,
        }),
      )
      writeFileSync(
        "playwright-summary.json",
        JSON.stringify({ status: result.status, tests: this.tests }, null, 2),
      )
      writeFileSync("playwright-report.md", this.renderMarkdown(result))
    } catch (e) {
      console.error(
        `[summaryReporter] rendering failed after run.json was written — uat-report/index.html, playwright-summary.json and/or playwright-report.md may be missing or stale: ${
          e instanceof Error ? e.message : String(e)
        }`,
      )
    }

    cpSync(UAT_DIR, archiveDir, { recursive: true })
    if (existsSync("playwright-summary.json"))
      copyFileSync(
        "playwright-summary.json",
        join(archiveDir, "playwright-summary.json"),
      )
    if (existsSync("playwright-report.md"))
      copyFileSync(
        "playwright-report.md",
        join(archiveDir, "playwright-report.md"),
      )
    console.log(`[summaryReporter] archived run → ${archiveDir}`)
  }

  private renderMarkdown(result: FullResult): string {
    // Tally by `outcome`, not raw `status`: each row below prints `t.outcome` too (did-not-run vs
    // skipped, expected-failure vs failed), and the count line must agree with what the rows say.
    const counts = this.tests.reduce<Record<string, number>>((acc, t) => {
      acc[t.outcome] = (acc[t.outcome] ?? 0) + 1
      return acc
    }, {})
    const lines: string[] = [
      `# E2E run report — ${result.status}`,
      "",
      `**Visual report: [uat-report/index.html](uat-report/index.html)** — open it in a browser for screenshots, film-strips and videos.`,
      "",
      Object.entries(counts)
        .map(([k, v]) => `${v} ${k}`)
        .join(" · "),
      "",
    ]
    for (const t of this.tests) {
      const icon =
        t.outcome === "passed" || t.outcome === "flaky"
          ? "✅"
          : t.outcome === "expected-failure"
            ? "🟠"
            : t.outcome === "skipped" || t.outcome === "did-not-run"
              ? "⏭️"
              : "❌"
      lines.push(`## ${icon} ${t.title}`)
      lines.push(`_${t.outcome} in ${(t.durationMs / 1000).toFixed(1)}s_`, "")
      const steps = t.journal.filter((e) => e.kind === "step")
      if (steps.length > 0) {
        lines.push(
          `**What it did:** ${steps.map((s) => s.name).join(" → ")}`,
          "",
        )
      }
      const txs = t.journal.filter((e) => e.kind === "tx")
      if (txs.length > 0) {
        lines.push("**Transactions:**", "")
        lines.push(
          "| # | during | call | status | block | gas |",
          "|---|---|---|---|---|---|",
        )
        txs.forEach((tx, i) => {
          const en = tx.enriched
          const call = en
            ? `${en.actor} → \`${en.call}\` on ${en.target.name}${
                en.source === "ui" ? " _(via app UI)_" : ""
              }`
            : tx.hash ?? "?"
          lines.push(
            `| ${i + 1} | ${en?.during ?? ""} | ${call} | ${tx.status} | ${
              tx.block
            } | ${tx.gasUsed} |`,
          )
        })
        lines.push("")
      }
      if (t.status !== "passed" && t.status !== "skipped") {
        lines.push(
          "**Why it failed:**",
          "```",
          t.error ?? "(no error)",
          "```",
          "",
        )
        if (t.failureShot)
          lines.push(
            `**Failure screenshot:** ${relative(process.cwd(), t.failureShot)}`,
            "",
          )
        if (t.video)
          lines.push(`**Video:** ${relative(process.cwd(), t.video)}`, "")
        if (t.failureState)
          lines.push(
            "**State at failure:**",
            "```json",
            JSON.stringify(t.failureState, null, 2),
            "```",
            "",
          )
        if (t.journal.length > 0) {
          lines.push("**Reproduction steps:**", "")
          t.journal.forEach((e, i) => {
            const desc =
              e.kind === "step"
                ? `do: ${e.name}`
                : e.kind === "nav"
                  ? `page → ${e.url}`
                  : e.kind === "tx"
                    ? e.enriched
                      ? `tx: ${e.enriched.line} (block ${e.block})`
                      : `tx ${e.hash} (${e.status}, block ${e.block})`
                    : `data: ${e.name} = ${JSON.stringify(e.data)}`
            lines.push(`${i + 1}. ${desc}`)
          })
          lines.push("")
        }
        for (const a of t.agreements) {
          lines.push(
            `<details><summary>${a.name}</summary>`,
            "",
            "```json",
            JSON.stringify(a.json, null, 2),
            "```",
            "",
            "</details>",
            "",
          )
        }
        if (t.screenshots.length > 0) {
          lines.push(
            `**Step screenshots:** ${t.screenshots
              .map((p) => relative(process.cwd(), p))
              .join(", ")}`,
            "",
          )
        }
      }
    }
    lines.push(
      "---",
      "_Per-step screenshots, videos and traces: `npx playwright show-report`._",
      "",
    )
    return lines.join("\n")
  }
}
export default SummaryReporter
