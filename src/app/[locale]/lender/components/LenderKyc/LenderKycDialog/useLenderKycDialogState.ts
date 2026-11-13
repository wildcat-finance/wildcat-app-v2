import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  SignLenderKycResult,
  useSignLenderKyc,
  useStartLenderKyc,
} from "@/app/[locale]/lender/hooks/useLenderKyc"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { lenderKycMockService } from "@/lib/lenderKyc/mockService"
import { LenderKycOutcome, LenderKycStartSource } from "@/lib/lenderKyc/types"
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
  const [isReady, setIsReady] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
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
  const visitSourceRef = useRef<LenderKycStartSource>("click")
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

  const recordPageHide = useCallback(() => {
    const currentStartId = startIdRef.current
    if (currentStartId) {
      lenderKycMockService.recordClosed(currentStartId)
    }
  }, [])

  useEffect(() => {
    const scope =
      open && address ? `${address.toLowerCase()}:${chainId}` : undefined
    if (scope !== lastScopeRef.current) {
      visitRef.current += 1
      visitSourceRef.current = lastScopeRef.current ? "walletSwitch" : "click"
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
    setIsReady(false)
    setIsStarting(false)
    resetForm()

    const showWalletStatus = (hasSavedRecord: boolean) => {
      setMode(hasSavedRecord ? "returning" : "new")
      setIsReady(true)
    }

    if (visitSourceRef.current === "click") {
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
        showWalletStatus(hasSavedRecord)
      })
    } else {
      lenderKycMockService
        .getWalletStatus(address)
        .then(({ hasSavedRecord }) => {
          if (session !== sessionRef.current) return
          showWalletStatus(hasSavedRecord)
        })
    }

    window.addEventListener("pagehide", recordPageHide)

    return () => {
      window.removeEventListener("pagehide", recordPageHide)
      sessionRef.current += 1
      closeCurrentStart()
    }
  }, [
    open,
    address,
    chainId,
    startKyc,
    resetForm,
    closeCurrentStart,
    recordPageHide,
  ])

  const fieldErrors = useMemo(
    () => validateLenderKycDetails(details),
    [details],
  )
  const hasFieldErrors = Object.keys(fieldErrors).length > 0

  const isLoading = !isReady
  const isSigning = signMutation.isPending || isStarting
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

  const ensureStartId = useCallback(
    async (isStillRelevant: () => boolean) => {
      if (startIdRef.current) return startIdRef.current
      if (!address) return undefined
      setIsStarting(true)
      try {
        const { start } = await startKyc({
          address,
          chainId,
          source: "walletSwitch",
        })
        if (!isStillRelevant()) {
          lenderKycMockService.recordClosed(start.id)
          return undefined
        }
        startIdRef.current = start.id
        setStartId(start.id)
        return start.id
      } finally {
        if (isStillRelevant()) setIsStarting(false)
      }
    },
    [address, chainId, startKyc],
  )

  const sign = useCallback(async () => {
    if (!open || !address || !isReady || isStarting) return
    if (hasFieldErrors) {
      setShowInvalid(true)
      return
    }
    setSignError(null)
    const session = sessionRef.current
    const isStillRelevant = () => session === sessionRef.current
    let currentStartId: string | undefined
    try {
      currentStartId = await ensureStartId(isStillRelevant)
    } catch {
      if (isStillRelevant()) setSignError("failed")
      return
    }
    if (!currentStartId || !isStillRelevant()) return
    try {
      const result = await signMutation.mutateAsync(
        isReturningLocked
          ? {
              kind: "ownership",
              startId: currentStartId,
              address,
              chainId,
              isStillRelevant,
            }
          : {
              kind: "details",
              startId: currentStartId,
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
      lenderKycMockService.recordNotSigned(currentStartId, kind)
    }
  }, [
    open,
    address,
    isReady,
    isStarting,
    hasFieldErrors,
    ensureStartId,
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
