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
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setTouModalOpen } from "@/store/slices/touModalSlice/touModalSlice"
import { COLORS } from "@/theme/colors"
import { dayjs } from "@/utils/dayjs"
import { formatServiceAgreementVersionLabel } from "@/utils/serviceAgreementVersions"

const dismissKey = (chainId: unknown, address: string, sha: string) =>
  `tou-reaccept-dismissed:${chainId}:${address.toLowerCase()}:${sha}`

// "17 Jan 2025" - matches the re-acceptance design mock.
const formatChipDate = (iso: string) => dayjs(iso).utc().format("DD MMM YYYY")

/// Global ToU status / re-acceptance modal.
/// Auto-opens for accounts whose acceptance is stale:
/// - staleWithinGrace: dismissible (header cross) until the deadline.
/// - staleExpired: forced choice - accept or decline (no dismiss).
/// - declined: dismissible notice; deposits / new markets / borrowing stay
///   blocked (withdrawals are never blocked), and re-accepting reinstates.
/// Can also be opened manually (footer "Terms of Use status" button) for any
/// state - that bypasses the session dismissal without erasing it, and adds
/// read-only views for signedCurrent / neverSigned accounts.
export const ToUReacceptanceModal = () => {
  const theme = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const forcedOpen = useAppSelector((state) => state.touModal.forcedOpen)
  const { address } = useAccount()
  const {
    touState,
    touDeadline,
    touCurrentVersion,
    touAcceptedVersion,
    selectedChainId,
  } = useNetworkGate()
  const accept = useAcceptToU()
  const decline = useDeclineToU()

  const [dismissed, setDismissed] = useState(false)
  const [view, setView] = useState<"main" | "decline">("main")
  const [reason, setReason] = useState("")

  const storageKey = useMemo(
    () =>
      address && touCurrentVersion
        ? dismissKey(
            selectedChainId,
            address,
            touCurrentVersion.plaintextSha256,
          )
        : null,
    [address, selectedChainId, touCurrentVersion],
  )

  useEffect(() => {
    if (!storageKey) return
    setDismissed(sessionStorage.getItem(storageKey) === "1")
    setView("main")
  }, [storageKey, touState])

  // A manual open doesn't outlive the surface it applies to: reset it when
  // the wallet disconnects or the user lands on /agreement (which has the
  // actions itself and always suppresses this modal).
  useEffect(() => {
    if (forcedOpen && (!address || pathname === ROUTES.agreement)) {
      dispatch(setTouModalOpen(false))
    }
  }, [address, dispatch, forcedOpen, pathname])

  const handleDismiss = () => {
    if (forcedOpen) dispatch(setTouModalOpen(false))
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

  const goToAgreement = () => {
    if (forcedOpen) dispatch(setTouModalOpen(false))
    router.push(ROUTES.agreement)
  }

  // The /agreement page is where stale users review and re-sign - never cover
  // it with this prompt.
  if (pathname === ROUTES.agreement) return null
  if (!address || !touState || !touCurrentVersion) return null

  const isGrace = touState === "staleWithinGrace"
  const isExpired = touState === "staleExpired"
  const isDeclined = touState === "declined"
  const isSignedCurrent = touState === "signedCurrent"
  const isNeverSigned = touState === "neverSigned"
  // Read-only status views: no sign/decline actions. The "stale" state
  // (newer version, no campaign) opens the normal sign/decline view.
  const isReadOnly = isSignedCurrent || isNeverSigned

  const autoOpen = isExpired || ((isGrace || isDeclined) && !dismissed)
  if (!forcedOpen && !autoOpen) return null

  const deadlineLabel = touDeadline
    ? dayjs(touDeadline).utc().format("MMMM DD, YYYY")
    : null
  const newVersionLabel = formatServiceAgreementVersionLabel(
    touCurrentVersion.version,
  )
  const canDismiss = !isExpired
  const isBusy = accept.isPending || decline.isPending

  const handleDecline = () => {
    decline.mutate(
      { reason: reason.trim() || undefined },
      { onSuccess: () => setView("main") },
    )
  }

  const title = (() => {
    if (view === "decline") return "Decline Terms of Use"
    if (isDeclined) return "Terms of Use Declined"
    if (isReadOnly) return "Terms of Use"
    return "Updated Terms of Use"
  })()

  let description = ""
  if (view === "decline") {
    description =
      `You are declining Terms of Use ${newVersionLabel}. Your decline is ` +
      `recorded with a wallet signature. Deposits, new markets and borrowing ` +
      `will be disabled for this account until you accept; withdrawals ` +
      `remain available.`
  } else if (isDeclined) {
    description =
      `You declined the current Wildcat Terms of Use (${newVersionLabel}). ` +
      `Deposits, new markets and borrowing are disabled for this account; ` +
      `withdrawals remain available. You can accept the terms at any time ` +
      `to restore full access.`
  } else if (isSignedCurrent) {
    description =
      "You have accepted the current Wildcat Terms of Use - you are up to date."
  } else if (isNeverSigned) {
    description =
      "This account has not accepted the Wildcat Terms of Use on this " +
      "network yet. Review and sign them on the agreement page."
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
    !!touAcceptedVersion && !isSignedCurrent && !isNeverSigned
  const showNewRow = !isSignedCurrent

  return (
    <Dialog
      open
      onClose={canDismiss && !isBusy ? handleDismiss : undefined}
      disableEscapeKeyDown={!canDismiss}
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
        crossOnClick={canDismiss && !isBusy ? handleDismiss : null}
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
              onClick={goToAgreement}
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

        {view === "main" && isNeverSigned && (
          <Button
            variant="contained"
            size="large"
            onClick={goToAgreement}
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
              disabled={isBusy || !accept.isReady}
              fullWidth
            >
              {accept.isPending ? "Signing..." : "Sign Terms of Use"}
            </Button>
            {!isDeclined && (
              <Button
                variant="contained"
                color="secondary"
                size="large"
                onClick={() => setView("decline")}
                disabled={isBusy}
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
              disabled={isBusy || !decline.isReady}
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
