import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  SignLenderKycResult,
  useSignLenderKyc,
  useStartLenderKyc,
} from "@/app/[locale]/lender/hooks/useLenderKyc"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { lenderKycMockService } from "@/lib/lenderKyc/mockService"
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
  const startMutation = useStartLenderKyc()
  const signMutation = useSignLenderKyc()
  const { mutateAsync: startKyc } = startMutation
  const { reset: resetSign } = signMutation

  const [startId, setStartId] = useState<string>()
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
  const [showInvalid, setShowInvalid] = useState(false)

  const startIdRef = useRef<string>()
  const sessionRef = useRef(0)
  const visitRef = useRef(0)
  const lastScopeRef = useRef<string>()
  const lastSessionRef = useRef<{ session: number; visit: number }>()
  const discardableSessionsRef = useRef(new Set<number>())

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
    setShowInvalid(false)
    resetSign()
  }, [resetSign])

  const closeCurrentStart = useCallback(() => {
    const currentStartId = startIdRef.current
    if (currentStartId) {
      lenderKycMockService.recordClosed(currentStartId)
    }
    startIdRef.current = undefined
  }, [])

  useEffect(() => {
    const scope =
      open && address ? `${address.toLowerCase()}:${chainId}` : undefined
    if (scope !== lastScopeRef.current) {
      visitRef.current += 1
      lastScopeRef.current = scope
    }
    if (!scope || !address) return undefined

    const previous = lastSessionRef.current
    if (previous && previous.visit === visitRef.current) {
      discardableSessionsRef.current.add(previous.session)
    }
    sessionRef.current += 1
    const session = sessionRef.current
    lastSessionRef.current = { session, visit: visitRef.current }
    setStartId(undefined)
    resetForm()

    startKyc({ address, chainId }).then(({ start, hasSavedRecord }) => {
      if (session !== sessionRef.current) {
        if (discardableSessionsRef.current.delete(session)) {
          lenderKycMockService.discardStart(start.id)
        } else {
          lenderKycMockService.recordClosed(start.id)
        }
        return
      }
      startIdRef.current = start.id
      setStartId(start.id)
      setMode(hasSavedRecord ? "returning" : "new")
    })

    window.addEventListener("pagehide", closeCurrentStart)

    return () => {
      window.removeEventListener("pagehide", closeCurrentStart)
      sessionRef.current += 1
      closeCurrentStart()
    }
  }, [open, address, chainId, startKyc, resetForm, closeCurrentStart])

  const fieldErrors = useMemo(
    () => validateLenderKycDetails(details),
    [details],
  )
  const hasFieldErrors = Object.keys(fieldErrors).length > 0

  const isLoading = !startId
  const isSigning = signMutation.isPending
  const isReturningLocked = mode === "returning" && !verifiedDetails
  const isDirty =
    !!verifiedDetails && !areLenderKycDetailsEqual(details, verifiedDetails)
  const canContinue = !!verifiedDetails && !isDirty && !isSigning
  const fieldsReadOnly = !!verifiedDetails && !isEditing
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

  const sign = useCallback(async () => {
    if (!address || !startId) return
    if (hasFieldErrors) {
      setShowInvalid(true)
      return
    }
    setSignError(null)
    const session = sessionRef.current
    const isStillRelevant = () => session === sessionRef.current
    try {
      const result = await signMutation.mutateAsync(
        isReturningLocked
          ? { kind: "ownership", startId, address, chainId, isStillRelevant }
          : {
              kind: "details",
              startId,
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
      const kind = classifyWalletSignError(error)
      if (kind === "unknown") {
        setSignError("failed")
        return
      }
      setSignError(kind)
      lenderKycMockService.recordNotSigned(startId, kind)
    }
  }, [
    address,
    startId,
    hasFieldErrors,
    signMutation,
    isReturningLocked,
    chainId,
    details,
    applySignResult,
  ])

  const continueToSoma = useCallback(() => {
    if (!startId || !canContinue) return
    lenderKycMockService.recordForward(startId)
    window.open(EXTERNAL_LINKS.SOMA_FINANCE, "_blank", "noopener,noreferrer")
  }, [startId, canContinue])

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
    isVerified: !!verifiedDetails,
    updateField,
    touchField,
    sign,
    continueToSoma,
    startEditing,
  }
}
