import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  SignLenderKycResult,
  usePendingSafeLenderKycDetails,
  useSignLenderKyc,
} from "@/app/[locale]/lender/hooks/useLenderKyc"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import {
  isLenderKycWalletMismatch,
  lenderKycApi,
} from "@/lib/lenderKyc/apiClient"
import { LenderKycOutcome } from "@/lib/lenderKyc/types"
import {
  areLenderKycDetailsEqual,
  LenderKycDetails,
} from "@/utils/lenderKycMessage"
import { classifyWalletSignError } from "@/utils/walletErrors"

import {
  EMPTY_LENDER_KYC_DETAILS,
  LenderKycFieldErrors,
  validateLenderKycDetails,
} from "./validation"

export type LenderKycDialogMode = "new" | "returning"

export type LenderKycSignError = "declined" | "walletMismatch" | "failed"

type FieldName = keyof LenderKycFieldErrors

export const useLenderKycDialogState = ({
  open,
  address,
  chainId,
}: {
  open: boolean
  address: string | undefined
  chainId: number
}) => {
  const signMutation = useSignLenderKyc()
  const { reset: resetSign } = signMutation
  const findPendingSafeDetails = usePendingSafeLenderKycDetails()
  const findPendingSafeDetailsRef = useRef(findPendingSafeDetails)

  useEffect(() => {
    findPendingSafeDetailsRef.current = findPendingSafeDetails
  }, [findPendingSafeDetails])

  const [isReady, setIsReady] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [mode, setMode] = useState<LenderKycDialogMode>("new")
  const [details, setDetails] = useState<LenderKycDetails>(
    EMPTY_LENDER_KYC_DETAILS,
  )
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>(
    {},
  )
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [verifiedDetails, setVerifiedDetails] =
    useState<LenderKycDetails | null>(null)
  const [savedAt, setSavedAt] = useState<string>()
  const [lastOutcome, setLastOutcome] = useState<LenderKycOutcome>()
  const [isEditing, setIsEditing] = useState(false)
  const [signError, setSignError] = useState<LenderKycSignError | null>(null)
  const [mismatchSigner, setMismatchSigner] = useState<string | null>(null)
  const [showInvalid, setShowInvalid] = useState(false)
  const [pendingSafeDetails, setPendingSafeDetails] =
    useState<LenderKycDetails | null>(null)

  const sessionRef = useRef(0)
  const statusKnownRef = useRef(false)

  const resetForm = useCallback(() => {
    setMode("new")
    setDetails(EMPTY_LENDER_KYC_DETAILS)
    setTouched({})
    setTermsAccepted(false)
    setVerifiedDetails(null)
    setSavedAt(undefined)
    setLastOutcome(undefined)
    setIsEditing(false)
    setSignError(null)
    setMismatchSigner(null)
    setShowInvalid(false)
    setPendingSafeDetails(null)
    resetSign()
  }, [resetSign])

  useEffect(() => {
    if (!open || !address) return undefined

    sessionRef.current += 1
    const session = sessionRef.current
    statusKnownRef.current = false
    setIsReady(false)
    setIsCheckingStatus(false)
    resetForm()

    const showWalletStatus = (hasSavedRecord: boolean, isKnown = true) => {
      const pending =
        isKnown && !hasSavedRecord
          ? findPendingSafeDetailsRef.current(address, chainId)
          : undefined
      if (pending) {
        setPendingSafeDetails(pending)
        setDetails(pending)
        setTermsAccepted(true)
      }
      statusKnownRef.current = isKnown
      setMode(hasSavedRecord ? "returning" : "new")
      setIsReady(true)
    }

    lenderKycApi.getWalletStatus(address, chainId).then(
      ({ hasSavedRecord }) => {
        if (session !== sessionRef.current) return
        showWalletStatus(hasSavedRecord)
      },
      () => {
        if (session !== sessionRef.current) return
        showWalletStatus(false, false)
      },
    )

    return () => {
      sessionRef.current += 1
    }
  }, [open, address, chainId, resetForm])

  const fieldErrors = useMemo(
    () => validateLenderKycDetails(details),
    [details],
  )
  const hasFieldErrors = Object.keys(fieldErrors).length > 0

  const isLoading = !isReady
  const isSigning = signMutation.isPending || isCheckingStatus
  const isReturningLocked = mode === "returning" && !verifiedDetails
  const isDirty =
    !!verifiedDetails && !areLenderKycDetailsEqual(details, verifiedDetails)
  const canContinue = !!verifiedDetails && !isDirty && !isSigning
  const fieldsReadOnly = !!verifiedDetails && !isEditing
  const resumesSafeRequest =
    !!pendingSafeDetails &&
    mode === "new" &&
    !verifiedDetails &&
    !isSigning &&
    areLenderKycDetailsEqual(details, pendingSafeDetails)
  const visibleFieldErrors = useMemo(() => {
    const visible: LenderKycFieldErrors = {}
    ;(Object.keys(fieldErrors) as FieldName[]).forEach((field) => {
      if (showInvalid || touched[field]) visible[field] = fieldErrors[field]
    })
    return visible
  }, [fieldErrors, showInvalid, touched])
  const hasVisibleFieldErrors = Object.keys(visibleFieldErrors).length > 0

  const canSign =
    !isLoading &&
    !isSigning &&
    !canContinue &&
    (isReturningLocked || termsAccepted) &&
    !hasVisibleFieldErrors

  const updateField = useCallback(
    <K extends keyof LenderKycDetails>(
      field: K,
      value: LenderKycDetails[K],
    ) => {
      setDetails((previous) => ({ ...previous, [field]: value }))
      setSignError(null)
    },
    [],
  )

  const touchField = useCallback((field: FieldName) => {
    setTouched((previous) => ({ ...previous, [field]: true }))
  }, [])

  const applySignResult = useCallback((result: SignLenderKycResult) => {
    if (result.kind === "ownership") {
      setDetails(result.profile.details)
      setVerifiedDetails(result.profile.details)
      setSavedAt(result.profile.savedAt)
      setTermsAccepted(true)
      setLastOutcome("unchanged")
    } else {
      setDetails(result.result.profile.details)
      setVerifiedDetails(result.result.profile.details)
      setSavedAt(result.result.profile.savedAt)
      setLastOutcome(result.result.outcome)
    }
    setIsEditing(false)
    setShowInvalid(false)
    setSignError(null)
  }, [])

  const refreshPendingSafeDetails = useCallback(() => {
    if (address) {
      setPendingSafeDetails(
        findPendingSafeDetailsRef.current(address, chainId) ?? null,
      )
    }
  }, [address, chainId])

  const sign = useCallback(async () => {
    if (!open || !address || !isReady || isCheckingStatus) return
    if (hasFieldErrors) {
      setShowInvalid(true)
      return
    }
    setSignError(null)
    const session = sessionRef.current
    const isStillRelevant = () => session === sessionRef.current
    if (mode === "new" && !verifiedDetails && !statusKnownRef.current) {
      setIsCheckingStatus(true)
      let hasSavedRecord: boolean
      try {
        ;({ hasSavedRecord } = await lenderKycApi.getWalletStatus(
          address,
          chainId,
        ))
      } catch {
        if (isStillRelevant()) {
          setIsCheckingStatus(false)
          setSignError("failed")
        }
        return
      }
      if (!isStillRelevant()) return
      setIsCheckingStatus(false)
      statusKnownRef.current = true
      if (hasSavedRecord) {
        setMode("returning")
        setDetails(EMPTY_LENDER_KYC_DETAILS)
        setTouched({})
        setShowInvalid(false)
        return
      }
    }
    refreshPendingSafeDetails()
    try {
      const result = await signMutation.mutateAsync(
        isReturningLocked
          ? {
              kind: "ownership",
              address,
              chainId,
              isStillRelevant,
            }
          : {
              kind: "details",
              address,
              chainId,
              details,
              isStillRelevant,
            },
      )
      if (session !== sessionRef.current) return
      applySignResult(result)
    } catch (error) {
      if (session !== sessionRef.current) return
      refreshPendingSafeDetails()
      if (isLenderKycWalletMismatch(error)) {
        setMismatchSigner(error.signer ?? null)
        setSignError("walletMismatch")
        return
      }
      const kind = classifyWalletSignError(error)
      if (kind === "unknown") {
        setSignError("failed")
        return
      }
      setMismatchSigner(null)
      setSignError(kind)
    }
  }, [
    open,
    address,
    isReady,
    isCheckingStatus,
    hasFieldErrors,
    mode,
    verifiedDetails,
    signMutation,
    isReturningLocked,
    chainId,
    details,
    applySignResult,
    refreshPendingSafeDetails,
  ])

  const continueToSoma = useCallback(() => {
    if (!canContinue) return
    window.open(EXTERNAL_LINKS.SOMA_FINANCE, "_blank", "noopener,noreferrer")
  }, [canContinue])

  const startEditing = useCallback(() => {
    setIsEditing(true)
  }, [])

  return {
    mode,
    details,
    termsAccepted,
    setTermsAccepted,
    savedAt,
    lastOutcome,
    signError,
    mismatchSigner,
    fieldErrors: visibleFieldErrors,
    showInvalidNotice: hasVisibleFieldErrors && !isReturningLocked,
    isLoading,
    isSigning,
    isReturningLocked,
    isDirty,
    isEditing,
    canContinue,
    canSign,
    fieldsReadOnly,
    resumesSafeRequest,
    isVerified: !!verifiedDetails,
    updateField,
    touchField,
    sign,
    continueToSoma,
    startEditing,
  }
}
