/** @jest-environment node */
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import {
  getCreateMarketFormFingerprint,
  getCreateMarketSignatureFingerprint,
} from "./deployFingerprint"
import {
  getRepaymentDeploymentTerms,
  getRepaymentTermIssues,
  supportsRepaymentSchedule,
} from "./repaymentTerms"

const now = 1_900_000_000
const values = {
  scheduleRepayment: true,
  repaymentDate: now + 86400,
  repaymentPeriod: 3600,
  marketType: "standard",
}

describe("repayment schedule", () => {
  it.each(["standard", "revolving"] as const)(
    "only exposes schedules for a capable %s deployment target",
    (kind) => {
      expect(supportsRepaymentSchedule(SupportedChainId.Sepolia, kind)).toBe(
        true,
      )
      expect(supportsRepaymentSchedule(SupportedChainId.Mainnet, kind)).toBe(
        false,
      )
    },
  )

  it("disabling scheduling clears deployment terms even when the form retains old values", () => {
    expect(
      getRepaymentDeploymentTerms({ ...values, scheduleRepayment: false }),
    ).toEqual({ repaymentDate: 0, repaymentPeriod: 0 })
    expect(getRepaymentDeploymentTerms({})).toEqual({
      repaymentDate: 0,
      repaymentPeriod: 0,
    })
    expect(
      getRepaymentTermIssues(
        { ...values, scheduleRepayment: false, repaymentDate: now - 1 },
        undefined,
        now,
      ),
    ).toEqual([])
  })

  it.each(["standard", "fixedTerm", "periodicTerm"])(
    "accepts zero-length repayment periods for %s",
    (marketType) => {
      expect(
        getRepaymentTermIssues(
          {
            ...values,
            marketType,
            repaymentPeriod: 0,
            fixedTermEndTime: values.repaymentDate,
          },
          undefined,
          now,
        ),
      ).toEqual([])
    },
  )

  it.each([undefined, now, now - 1, now + 0.5, Number.NaN])(
    "rejects a missing, expired or fractional date: %s",
    (repaymentDate) => {
      expect(
        getRepaymentTermIssues({ ...values, repaymentDate }, undefined, now)[0]
          .path,
      ).toBe("repaymentDate")
    },
  )

  it.each([undefined, -1, 0.5, 90 * 86400 + 1, Number.NaN])(
    "rejects invalid periods: %s",
    (repaymentPeriod) => {
      expect(
        getRepaymentTermIssues(
          { ...values, repaymentPeriod },
          undefined,
          now,
        )[0].path,
      ).toBe("repaymentPeriod")
    },
  )

  it("uses inclusive policy bounds and respects real zero bounds", () => {
    expect(
      getRepaymentTermIssues(
        values,
        { maximumRepaymentPeriod: 3600, maximumRepaymentDateDelay: 86400 },
        now,
      ),
    ).toEqual([])
    expect(
      getRepaymentTermIssues(
        values,
        { maximumRepaymentPeriod: 0, maximumRepaymentDateDelay: 0 },
        now,
      ),
    ).toHaveLength(2)
  })

  it("allows fixed-term schedules beyond the open/periodic delay but never before maturity", () => {
    const delayed = { ...values, repaymentDate: now + 731 * 86400 }
    expect(getRepaymentTermIssues(delayed, undefined, now)).toHaveLength(1)
    expect(
      getRepaymentTermIssues(
        { ...delayed, marketType: "fixedTerm", fixedTermEndTime: now + 86400 },
        undefined,
        now,
      ),
    ).toEqual([])
    expect(
      getRepaymentTermIssues(
        {
          ...values,
          marketType: "fixedTerm",
          fixedTermEndTime: values.repaymentDate + 1,
        },
        undefined,
        now,
      )[0].message,
    ).toContain("maturity")
  })

  it("rejects a deadline overflowing the protocol timestamp", () => {
    expect(
      getRepaymentTermIssues(
        {
          ...values,
          marketType: "fixedTerm",
          repaymentDate: 0xffffffff,
          repaymentPeriod: 1,
        },
        undefined,
        now,
      )[0].message,
    ).toContain("date range")
  })

  it("binds the schedule to Safe deployment drafts and agreement signatures", () => {
    const original = { ...values, mla: "1" }
    const changed = { ...original, repaymentPeriod: 0 }
    expect(getCreateMarketFormFingerprint(original)).not.toEqual(
      getCreateMarketFormFingerprint(changed),
    )
    expect(getCreateMarketSignatureFingerprint(original)).not.toEqual(
      getCreateMarketSignatureFingerprint(changed),
    )
  })
})
