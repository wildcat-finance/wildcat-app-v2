/** @jest-environment node */

import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import {
  ACCEPTED_REFERENCE_DIFFERENCES,
  GLASS_DOOR_REFERENCE_BLOCK,
  GLASS_DOOR_REFERENCE_MARKET,
  PRODUCT_908_REFERENCE,
  ReferenceScope,
} from "./product908"
import { deserializeDataset } from "../../export/serialize/dataset"
import { borrowerMetrics, marketMetrics, MetricValue } from "../datasetMetrics"
import { formatHours } from "../format"

const fixtures = path.join(__dirname, "..", "__fixtures__")
const datasets = readdirSync(fixtures)
  .filter((file) => file.startsWith(`reference-${GLASS_DOOR_REFERENCE_BLOCK}-`))
  .map((file) => deserializeDataset(readFileSync(path.join(fixtures, file))))
const referenceMarket = datasets.find(
  (dataset) =>
    dataset.market.address.toLowerCase() === GLASS_DOOR_REFERENCE_MARKET,
)
if (!referenceMarket) throw new Error("Reference market fixture is missing")

// Some ids (D18) exist for both a market and its borrower.
const computed: Record<ReferenceScope, Record<string, MetricValue>> = {
  market: marketMetrics(referenceMarket),
  borrower: borrowerMetrics(datasets),
}

const NUMERIC = /^[+-]?[\d,]+(\.\d+)?%?$/

// Durations in hours display rounded up to one decimal (product#908 ruling).
const HOURS = new Set(["M15", "M16", "M22", "M23", "M80", "M82", "D16"])

// Round half away from zero to the precision the reference prints.
const asDisplayed = (id: string, value: MetricValue, reference: string) => {
  if (HOURS.has(id)) {
    return Number(formatHours(Number(value) * 3_600).replace(/[ h,]/g, ""))
  }
  if (!NUMERIC.test(reference)) return String(value)
  const decimals = reference.replace("%", "").split(".")[1]?.length ?? 0
  const scale = 10 ** decimals
  const number = Number(value)
  return (Math.sign(number) * Math.round(Math.abs(number) * scale)) / scale
}
const expected = (reference: string) =>
  NUMERIC.test(reference) ? Number(reference.replace(/[,%+]/g, "")) : reference

describe(`product#908 reference values at block ${GLASS_DOOR_REFERENCE_BLOCK}`, () => {
  it("covers every reference id once", () => {
    const ids = PRODUCT_908_REFERENCE.map(({ id }) => id)
    expect(ids).toHaveLength(91)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("splits the 55 uncovered deadlines into paid late and never paid (D18)", () => {
    const late = Number(computed.market.D18_LATE)
    const never = Number(computed.market.D18_NEVER)
    expect(late + never).toBe(55)
    expect(computed.market.D18).toBe(`${late} / ${never}`)
  })

  PRODUCT_908_REFERENCE.forEach(({ id, name, scope, reference }) => {
    const value = computed[scope][id]
    const accepted = ACCEPTED_REFERENCE_DIFFERENCES[id]
    if (value === undefined) {
      it.todo(`${id} ${name} = ${reference}`)
    } else if (
      accepted &&
      asDisplayed(id, value, reference) !== expected(reference)
    ) {
      it.skip(`${id} ${name}: computed ${asDisplayed(
        id,
        value,
        reference,
      )}, reference ${reference} (${accepted})`, () => {})
    } else {
      it(`${id} ${name} = ${reference}`, () => {
        expect(asDisplayed(id, value, reference)).toBe(expected(reference))
      })
    }
  })
})
