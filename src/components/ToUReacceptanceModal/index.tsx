"use client"

import { useEffect, useMemo, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  TextField,
  Typography,
  useTheme,
} from "@mui/material"
import { usePathname, useRouter } from "next/navigation"
import { useAccount } from "wagmi"

import { ServiceAgreementVersionChip } from "@/components/ServiceAgreementVersionChip"
import { TxModalFooterContainer } from "@/components/TxModalComponents/TxModalFooter/style"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { useNetworkGate } from "@/hooks/useNetworkGate"
import { useAcceptToU, useDeclineToU } from "@/hooks/useToUReacceptance"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { dayjs } from "@/utils/dayjs"
import { formatServiceAgreementVersionLabel } from "@/utils/serviceAgreementVersions"

const dismissKey = (chainId: unknown, address: string, sha: string) =>
  `tou-reaccept-dismissed:${chainId}:${address.toLowerCase()}:${sha}`

/// Global re-acceptance prompt for accounts whose ToU acceptance is stale.
/// Styled after NonMlaAcknowledgementModal (the app's accept/decline dialog).
/// - staleWithinGrace: dismissible (header cross) until the deadline.
/// - staleExpired: forced choice - accept or decline (no dismiss).
/// - declined: dismissible notice; deposits / new markets / borrowing stay
///   blocked (withdrawals are never blocked), and re-accepting reinstates.
export const ToUReacceptanceModal = () => {
  const theme = useTheme()
  const pathname = usePathname()
  const router = useRouter()
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

  const handleDismiss = () => {
    if (storageKey) sessionStorage.setItem(storageKey, "1")
    setDismissed(true)
  }

  // The /agreement page is where stale users review and re-sign - never cover
  // it with this prompt.
  if (pathname === ROUTES.agreement) return null
  if (!address || !touState || !touCurrentVersion) return null

  const isGrace = touState === "staleWithinGrace"
  const isExpired = touState === "staleExpired"
  const isDeclined = touState === "declined"
  if (!isGrace && !isExpired && !isDeclined) return null
  if ((isGrace || isDeclined) && dismissed) return null

  const deadlineLabel = touDeadline
    ? dayjs(touDeadline).utc().format("MMMM DD, YYYY")
    : null
  const newVersionLabel = formatServiceAgreementVersionLabel(
    touCurrentVersion.version,
  )
  const canDismiss = isGrace || isDeclined
  const isBusy = accept.isPending || decline.isPending

  const handleDecline = () => {
    decline.mutate(
      { reason: reason.trim() || undefined },
      { onSuccess: () => setView("main") },
    )
  }

  const title = (() => {
    if (view === "decline") return "Decline Terms of Use"
    return isDeclined ? "Terms of Use Declined" : "Updated Terms of Use"
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
  } else if (isExpired) {
    description =
      "The Wildcat Terms of Use have been updated. The signing deadline " +
      "has passed - accept or decline to continue."
  } else {
    description = `The Wildcat Terms of Use have been updated.${
      deadlineLabel ? ` Please sign the new version by ${deadlineLabel}.` : ""
    }`
  }

  return (
    <Dialog
      open
      onClose={canDismiss && !isBusy ? handleDismiss : undefined}
      disableEscapeKeyDown={!canDismiss}
      sx={{
        "& .MuiDialog-paper": {
          width: "440px",
          maxWidth: "440px",
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
          <Box
            sx={{
              border: `1px solid ${COLORS.whiteLilac}`,
              borderRadius: "12px",
              padding: "14px 16px",
              backgroundColor: COLORS.alabaster,
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {touAcceptedVersion && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="text3" color={COLORS.santasGrey}>
                  Version you&apos;ve signed
                </Typography>
                <ServiceAgreementVersionChip
                  version={touAcceptedVersion.version}
                  tone="stale"
                />
              </Box>
            )}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="text3" color={COLORS.santasGrey}>
                New Version
              </Typography>
              <ServiceAgreementVersionChip
                version={touCurrentVersion.version}
                tone="current"
              />
            </Box>
            <Typography
              variant="text3"
              color={COLORS.blueRibbon}
              onClick={() => router.push(ROUTES.agreement)}
              sx={{ cursor: "pointer", width: "fit-content", marginTop: "8px" }}
            >
              View full terms
            </Typography>
          </Box>
        )}

        {view === "decline" && (
          <TextField
            label="Reason (optional)"
            multiline
            minRows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            inputProps={{ maxLength: 1000 }}
          />
        )}
      </Box>

      <Box
        sx={{
          ...TxModalFooterContainer(theme),
          marginTop: "24px",
        }}
      >
        {view === "main" ? (
          <>
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
            <Button
              variant="contained"
              size="large"
              onClick={() => accept.mutate()}
              disabled={isBusy || !accept.isReady}
              fullWidth
            >
              {accept.isPending ? "Signing..." : "Sign Terms of Use"}
            </Button>
          </>
        ) : (
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
