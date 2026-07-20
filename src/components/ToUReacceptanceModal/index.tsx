"use client"

import { useEffect, useMemo, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  Divider,
  TextField,
  Typography,
  useTheme,
} from "@mui/material"
import { usePathname, useRouter } from "next/navigation"
import { useAccount } from "wagmi"

import { ServiceAgreementChip } from "@/components/ServiceAgreementVersionChip"
import { TxModalFooterContainer } from "@/components/TxModalComponents/TxModalFooter/style"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { useNetworkGate } from "@/hooks/useNetworkGate"
import { useAcceptToU, useDeclineToU } from "@/hooks/useToUReacceptance"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setTouModalOpen } from "@/store/slices/touModalSlice/touModalSlice"
import { COLORS } from "@/theme/colors"
import { dayjs } from "@/utils/dayjs"
import {
  getServiceAgreementRouteForParty,
  isServiceAgreementPath,
} from "@/utils/serviceAgreementParty"
import { formatServiceAgreementVersionLabel } from "@/utils/serviceAgreementVersions"

const dismissKey = (
  chainId: unknown,
  address: string,
  party: string,
  sha: string,
) =>
  `tou-reaccept-dismissed:${chainId}:${address.toLowerCase()}:${party}:${sha}`

// "17 Jan 2025" - matches the re-acceptance design mock.
const formatChipDate = (iso: string) => dayjs(iso).utc().format("DD MMM YYYY")

/// Global ToU status / re-acceptance modal.
/// Auto-opens for accounts whose acceptance is stale:
/// - staleWithinGrace: dismissible (header cross) until the deadline.
/// - staleExpired: forced choice - accept or decline (no dismiss).
/// - declined: dismissible notice; actions for the active capacity stay
///   blocked (withdrawals are never blocked), and re-accepting reinstates.
/// Can also be opened manually (footer "Terms of Use status" button) for any
/// state - that bypasses the session dismissal without erasing it, and adds
/// read-only views for signedCurrent accounts and first-time Lenders.
export const ToUReacceptanceModal = () => {
  const theme = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const forcedOpen = useAppSelector((state) => state.touModal.forcedOpen)
  const pendingSafeMessages = useAppSelector(
    (state) => state.pendingSafeMessages.records,
  )
  const { address } = useAccount()
  const {
    touState,
    touDeadline,
    touCurrentVersion,
    touAcceptedVersion,
    touParty,
    selectedChainId,
    isWrongNetwork,
  } = useNetworkGate()
  const accept = useAcceptToU(touParty)
  const decline = useDeclineToU(touParty)

  const [dismissed, setDismissed] = useState(false)
  const [pendingDismissed, setPendingDismissed] = useState(false)
  const [view, setView] = useState<"main" | "decline">("main")
  const [reason, setReason] = useState("")

  const storageKey = useMemo(
    () =>
      address && touCurrentVersion
        ? dismissKey(
            selectedChainId,
            address,
            touParty,
            touCurrentVersion.plaintextSha256,
          )
        : null,
    [address, selectedChainId, touCurrentVersion, touParty],
  )

  useEffect(() => {
    if (!storageKey) return
    setDismissed(sessionStorage.getItem(storageKey) === "1")
    setPendingDismissed(false)
    setView("main")
    setReason("")
  }, [storageKey, touState])

  const hasPendingSafeAction = Object.values(pendingSafeMessages).some(
    (record) =>
      (record.flow === "tou-accept" || record.flow === "tou-decline") &&
      record.address === address?.toLowerCase() &&
      record.chainId === selectedChainId &&
      record.context?.party === touParty &&
      record.status !== "failed",
  )

  useEffect(() => {
    if (!hasPendingSafeAction) setPendingDismissed(false)
  }, [hasPendingSafeAction])

  // A manual open doesn't outlive the surface it applies to: reset it when
  // the wallet disconnects or the user lands on an agreement page (which has
  // the actions itself and always suppresses this modal).
  useEffect(() => {
    if (forcedOpen && (!address || isServiceAgreementPath(pathname))) {
      dispatch(setTouModalOpen(false))
    }
  }, [address, dispatch, forcedOpen, pathname])

  const handleDismiss = () => {
    if (forcedOpen) dispatch(setTouModalOpen(false))
    if (touState === "staleExpired" && hasPendingSafeAction) {
      setPendingDismissed(true)
    }
    // Only stamp the session dismissal for states whose AUTO popup is
    // dismissible - a manual open of a read-only view never records one.
    if (
      storageKey &&
      (touState === "staleWithinGrace" || touState === "declined")
    ) {
      sessionStorage.setItem(storageKey, "1")
      setDismissed(true)
    }
  }

  const viewFullTerms = () => {
    if (forcedOpen) dispatch(setTouModalOpen(false))
    router.push(getServiceAgreementRouteForParty(touParty))
  }

  // Agreement pages are where users review and re-sign - never cover them
  // with this prompt.
  if (isServiceAgreementPath(pathname)) return null
  if (!address || !touState || !touCurrentVersion) return null

  const isGrace = touState === "staleWithinGrace"
  const isExpired = touState === "staleExpired"
  const isDeclined = touState === "declined"
  const isSignedCurrent = touState === "signedCurrent"
  const isNeverSigned = touState === "neverSigned"
  // Read-only status views: no sign/decline actions. The "stale" state
  // (newer version, no campaign) opens the normal sign/decline view.
  const isReadOnly = isSignedCurrent || (isNeverSigned && touParty === "Lender")

  const autoOpen =
    (isExpired && !pendingDismissed) || ((isGrace || isDeclined) && !dismissed)
  if (!forcedOpen && !autoOpen) return null

  const deadlineLabel = touDeadline
    ? dayjs(touDeadline).utc().format("MMMM DD, YYYY")
    : null
  const newVersionLabel = formatServiceAgreementVersionLabel(
    touCurrentVersion.version,
  )
  const isBusy = accept.isPending || decline.isPending
  const canDismiss = !isExpired || hasPendingSafeAction
  const canClose = canDismiss && (!isBusy || hasPendingSafeAction)
  let signingAs: string | null = null
  if (accept.party) {
    signingAs =
      accept.party.party === "Borrower"
        ? `Borrower (${accept.party.organizationName})`
        : "Lender"
  }

  const handleDecline = () => {
    decline.mutate(
      { reason: reason.trim() || undefined },
      { onSuccess: () => setView("main") },
    )
  }

  const openDecline = () => {
    if (decline.pendingReason !== undefined) {
      setReason(decline.pendingReason)
    }
    setView("decline")
  }

  const title = (() => {
    if (view === "decline") return "Decline Terms of Use"
    if (isDeclined) return "Terms of Use Declined"
    if (isReadOnly) return "Terms of Use"
    return "Updated Terms of Use"
  })()

  const restrictedActions =
    touParty === "Borrower" ? "new markets and borrowing" : "deposits"
  let description = ""
  if (view === "decline") {
    description =
      `You are declining Terms of Use ${newVersionLabel}. Your decline is ` +
      `recorded with a wallet signature. For this ${touParty} capacity, ` +
      `${restrictedActions} will be disabled until you accept; withdrawals ` +
      `remain available.`
  } else if (isDeclined) {
    description =
      `You declined the current Wildcat Terms of Use (${newVersionLabel}). ` +
      `For this ${touParty} capacity, ${restrictedActions} are disabled; ` +
      `withdrawals remain available. You can accept the terms at any time to ` +
      `restore access in this capacity.`
  } else if (isSignedCurrent) {
    description =
      "You have accepted the current Wildcat Terms of Use - you are up to date."
  } else if (isNeverSigned) {
    description = `This account has not accepted the Wildcat Terms of Use as ${touParty} on this network yet.`
  } else if (isExpired) {
    description =
      "The Wildcat Terms of Use have been updated. The signing deadline " +
      "has passed - accept or decline to continue."
  } else {
    description = `The Wildcat Terms of Use have been updated.${
      deadlineLabel ? ` Please sign the new version by ${deadlineLabel}.` : ""
    }`
  }

  // In the signedCurrent view the accepted version IS the current one - show
  // a single blue row. Everywhere else: grey signed row + blue new row.
  const showSignedRow =
    !!touAcceptedVersion &&
    !isSignedCurrent &&
    !isNeverSigned &&
    touAcceptedVersion.plaintextSha256 !== touCurrentVersion.plaintextSha256
  const showNewRow = !isSignedCurrent

  return (
    <Dialog
      open
      onClose={canClose ? handleDismiss : undefined}
      disableEscapeKeyDown={!canClose}
      sx={{
        "& .MuiDialog-paper": {
          width: "440px",
          maxWidth: "min(440px, calc(100vw - 32px))",
          minWidth: 0,
          border: "none",
          borderRadius: "20px",
          margin: 0,
          padding: "24px 0",
        },
      }}
    >
      <TxModalHeader
        title={title}
        arrowOnClick={
          view === "decline" && !isBusy ? () => setView("main") : null
        }
        crossOnClick={canClose ? handleDismiss : null}
      />

      <Box
        sx={{
          width: "440px",
          maxWidth: "100%",
          boxSizing: "border-box",
          padding: "0 24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <Typography variant="text3" color={COLORS.santasGrey}>
          {description}
        </Typography>

        {(!isReadOnly || view === "decline") && signingAs && (
          <Typography variant="text3" color={COLORS.blackRock}>
            <strong>Signing as:</strong> {signingAs}
          </Typography>
        )}

        {view === "main" && (
          <>
            <Box
              sx={{
                border: `1px solid ${COLORS.whiteLilac}`,
                borderRadius: "12px",
                padding: "14px 16px",
                backgroundColor: COLORS.alabaster,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {isSignedCurrent && touAcceptedVersion && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="text3"
                    fontWeight={600}
                    color={COLORS.ultramarineBlue}
                    title={touAcceptedVersion.version}
                  >
                    {`Signed ${formatServiceAgreementVersionLabel(
                      touAcceptedVersion.version,
                    )}`}
                  </Typography>
                  <ServiceAgreementChip
                    label={formatChipDate(touAcceptedVersion.effectiveDate)}
                    tone="current"
                  />
                </Box>
              )}
              {showSignedRow && touAcceptedVersion && (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      variant="text3"
                      color={COLORS.santasGrey}
                      title={touAcceptedVersion.version}
                    >
                      {`Signed ${formatServiceAgreementVersionLabel(
                        touAcceptedVersion.version,
                      )}`}
                    </Typography>
                    <ServiceAgreementChip
                      label={formatChipDate(touAcceptedVersion.effectiveDate)}
                      tone="stale"
                    />
                  </Box>
                  <Divider sx={{ borderColor: COLORS.whiteLilac }} />
                </>
              )}
              {showNewRow && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="text3"
                    fontWeight={600}
                    color={COLORS.ultramarineBlue}
                    title={touCurrentVersion.version}
                  >
                    {isNeverSigned
                      ? `Current ${newVersionLabel}`
                      : `New ${newVersionLabel}`}
                  </Typography>
                  <ServiceAgreementChip
                    label={formatChipDate(touCurrentVersion.effectiveDate)}
                    tone="current"
                  />
                </Box>
              )}
            </Box>
            <Typography
              variant="text3"
              color={COLORS.blueRibbon}
              onClick={viewFullTerms}
              sx={{ cursor: "pointer", alignSelf: "center" }}
            >
              View full terms
            </Typography>
          </>
        )}

        {view === "decline" && (
          <TextField
            label="Reason (optional)"
            multiline
            minRows={2}
            fullWidth
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            inputProps={{ maxLength: 1000 }}
            // The theme pins MuiTextField roots to a fixed height (44px for
            // the default size), which clips a multiline field - let it grow.
            sx={{
              height: "auto",
              "& .MuiInputBase-root": { height: "auto" },
            }}
          />
        )}
      </Box>

      <Box
        sx={{
          ...TxModalFooterContainer(theme),
          marginTop: "24px",
        }}
      >
        {view === "main" && isSignedCurrent && (
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={handleDismiss}
            fullWidth
          >
            Close
          </Button>
        )}

        {view === "main" && isNeverSigned && isReadOnly && (
          <Button
            variant="contained"
            size="large"
            onClick={viewFullTerms}
            fullWidth
          >
            Review Terms of Use
          </Button>
        )}

        {view === "main" && !isReadOnly && (
          <>
            <Button
              variant="contained"
              size="large"
              onClick={() => accept.mutate()}
              disabled={isBusy || !accept.isReady || isWrongNetwork}
              fullWidth
            >
              {accept.isPending ? "Signing..." : "Sign Terms of Use"}
            </Button>
            {!isDeclined && (
              <Button
                variant="contained"
                color="secondary"
                size="large"
                onClick={openDecline}
                disabled={isBusy || isWrongNetwork}
                fullWidth
              >
                Decline
              </Button>
            )}
          </>
        )}

        {view === "decline" && (
          <>
            <Button
              variant="contained"
              color="secondary"
              size="large"
              onClick={() => setView("main")}
              disabled={isBusy}
              fullWidth
            >
              Back
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={handleDecline}
              disabled={isBusy || !decline.isReady || isWrongNetwork}
              fullWidth
            >
              {decline.isPending ? "Signing..." : "Sign Decline"}
            </Button>
          </>
        )}
      </Box>
    </Dialog>
  )
}
