/* eslint-disable import/no-extraneous-dependencies */
import { act, renderHook, waitFor } from "@testing-library/react"

import { useNewMarketForm } from "./useNewMarketForm"

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const MINUTE = 60
const DAY = 24 * 60 * MINUTE
const PERIOD_RELATION_ERROR =
  "Withdrawal window must be shorter than the withdrawal period"

const renderNewMarketForm = () =>
  renderHook(() => {
    const form = useNewMarketForm(false)
    return { form, errors: form.formState.errors }
  })

const setPeriodicTerms = (
  form: ReturnType<typeof useNewMarketForm>,
  {
    periodDuration,
    withdrawalWindowDuration,
  }: { periodDuration: number; withdrawalWindowDuration: number },
) => {
  form.setValue("marketType", "periodicTerm")
  form.setValue("firstWithdrawalWindowStart", Math.floor(Date.now() / 1_000))
  form.setValue("periodDuration", periodDuration)
  form.setValue("withdrawalWindowDuration", withdrawalWindowDuration)
}

describe("useNewMarketForm periodic term field validation", () => {
  it("validates a sub-minimum period while the rest of the form is incomplete", async () => {
    const { result } = renderNewMarketForm()

    act(() => {
      setPeriodicTerms(result.current.form, {
        periodDuration: 5 * MINUTE,
        withdrawalWindowDuration: MINUTE,
      })
      result.current.form.setValue("periodDuration", 5 * MINUTE, {
        shouldValidate: true,
      })
    })

    await waitFor(() => {
      expect(result.current.errors.periodDuration?.message).toBe(
        "Withdrawal period must be at least 6 minutes",
      )
    })
  })

  it("validates equality when the withdrawal window changes", async () => {
    const { result } = renderNewMarketForm()

    act(() => {
      setPeriodicTerms(result.current.form, {
        periodDuration: 10 * MINUTE,
        withdrawalWindowDuration: 5 * MINUTE,
      })
      result.current.form.setValue("withdrawalWindowDuration", 10 * MINUTE, {
        shouldValidate: true,
      })
    })

    await waitFor(() => {
      expect(result.current.errors.withdrawalWindowDuration?.message).toBe(
        PERIOD_RELATION_ERROR,
      )
    })
  })

  it("clears the window error when the period becomes longer", async () => {
    const { result } = renderNewMarketForm()

    act(() => {
      setPeriodicTerms(result.current.form, {
        periodDuration: DAY,
        withdrawalWindowDuration: 3 * DAY,
      })
      result.current.form.setValue("withdrawalWindowDuration", 3 * DAY, {
        shouldValidate: true,
      })
    })

    await waitFor(() => {
      expect(result.current.errors.withdrawalWindowDuration?.message).toBe(
        PERIOD_RELATION_ERROR,
      )
    })

    act(() => {
      result.current.form.setValue("periodDuration", 4 * DAY, {
        shouldValidate: true,
      })
    })

    await waitFor(() => {
      expect(result.current.errors.withdrawalWindowDuration).toBeUndefined()
    })
  })

  it("adds the window error when the period becomes shorter", async () => {
    const { result } = renderNewMarketForm()

    act(() => {
      setPeriodicTerms(result.current.form, {
        periodDuration: 4 * DAY,
        withdrawalWindowDuration: 3 * DAY,
      })
      result.current.form.setValue("withdrawalWindowDuration", 3 * DAY, {
        shouldValidate: true,
      })
    })

    await waitFor(() => {
      expect(result.current.errors.withdrawalWindowDuration).toBeUndefined()
    })

    act(() => {
      result.current.form.setValue("periodDuration", DAY, {
        shouldValidate: true,
      })
    })

    await waitFor(() => {
      expect(result.current.errors.withdrawalWindowDuration?.message).toBe(
        PERIOD_RELATION_ERROR,
      )
    })
  })
})
