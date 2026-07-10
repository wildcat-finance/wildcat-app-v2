import { useEffect } from "react"

import { useAppDispatch } from "@/store/hooks"
import {
  CreateMarketSteps,
  setCreatingStep,
  setIsDisabled,
  setIsValid,
} from "@/store/slices/createMarketSidebarSlice/createMarketSidebarSlice"

import { FinancialFormProps } from "./interface"

export const useFinancialFormState = (
  form: FinancialFormProps["form"],
  additionalValidityTerms: boolean[] = [],
) => {
  const dispatch = useAppDispatch()
  const {
    formState: { errors },
    watch,
  } = form

  const capacityWatch = watch("maxTotalSupply")
  const baseAprWatch = watch("annualInterestBips")
  const penaltyAprWatch = watch("delinquencyFeeBips")
  const ratioWatch = watch("reserveRatioBips")
  const delinquencyGracePeriodWatch = watch("delinquencyGracePeriod")
  const withdrawalBatchDurationWatch = watch("withdrawalBatchDuration")
  const delinquencyGracePeriodNumber = Number(delinquencyGracePeriodWatch)
  const withdrawalBatchDurationNumber = Number(withdrawalBatchDurationWatch)

  const hasValidPeriodsValues =
    Number.isFinite(delinquencyGracePeriodNumber) &&
    Number.isFinite(withdrawalBatchDurationNumber) &&
    delinquencyGracePeriodNumber > 0 &&
    withdrawalBatchDurationNumber > 0

  const showGraceVsWithdrawalWarning =
    hasValidPeriodsValues &&
    !errors.delinquencyGracePeriod &&
    !errors.withdrawalBatchDuration &&
    delinquencyGracePeriodNumber < withdrawalBatchDurationNumber

  const isFormValid =
    !!capacityWatch &&
    !errors.maxTotalSupply &&
    !!baseAprWatch &&
    !errors.annualInterestBips &&
    !!penaltyAprWatch &&
    !errors.delinquencyFeeBips &&
    !!ratioWatch &&
    !errors.reserveRatioBips &&
    additionalValidityTerms.every(Boolean) &&
    !!delinquencyGracePeriodWatch &&
    !errors.delinquencyGracePeriod &&
    !!withdrawalBatchDurationWatch &&
    !errors.withdrawalBatchDuration

  useEffect(() => {
    dispatch(
      setIsValid({ step: CreateMarketSteps.FINANCIAL, valid: isFormValid }),
    )

    if (isFormValid) {
      dispatch(
        setIsDisabled({
          steps: [CreateMarketSteps.LRESTRICTIONS],
          disabled: !isFormValid,
        }),
      )
    } else {
      const allStepsToDisable = [
        CreateMarketSteps.CONFIRM,
        CreateMarketSteps.LRESTRICTIONS,
      ]

      dispatch(setIsDisabled({ steps: allStepsToDisable, disabled: true }))
    }
  }, [dispatch, isFormValid])

  const handleNextClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.LRESTRICTIONS))
  }

  const handleBackClick = () => {
    dispatch(setCreatingStep(CreateMarketSteps.BASIC))
  }

  return {
    handleBackClick,
    handleNextClick,
    isFormValid,
    showGraceVsWithdrawalWarning,
  }
}
