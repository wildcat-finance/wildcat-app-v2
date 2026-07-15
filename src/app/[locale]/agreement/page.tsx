"use client"

import { Box, Button, Typography, useTheme } from "@mui/material"
import { useRouter } from "next/navigation"
import { Trans } from "react-i18next"

import { ServiceAgreementVersionChip } from "@/components/ServiceAgreementVersionChip"
import { useCurrentServiceAgreement } from "@/hooks/useCurrentServiceAgreement"
import { useNetworkGate } from "@/hooks/useNetworkGate"

import { AgreementText } from "./components/AgreementText"
import { ReacceptButton } from "./components/ReacceptButton"
import { SignButton } from "./components/SignButton"

export default function Agreement() {
  const theme = useTheme()
  const router = useRouter()
  const { data: currentAgreement, isLoading: isAgreementLoading } =
    useCurrentServiceAgreement()
  const { touState, isAgreementSigned } = useNetworkGate()

  // The primary action derives from two independent axes: touState (the
  // any-party re-acceptance campaign) and isAgreementSigned (the
  // Lender-party-scoped signature that hard-gates /lender pages).
  // - signedCurrent + lender signature: read-only review (e.g. "View full
  //   terms" in the ToU status modal) - nothing to sign, Cancel + Download.
  // - stale*/declined: party-aware re-acceptance; the legacy lender-only flow
  //   would record borrowers under the wrong party.
  // - neverSigned, or signedCurrent WITHOUT a lender signature (dual-role
  //   accounts, e.g. a registered borrower browsing /lender - their
  //   Borrower-party acceptance satisfies the campaign but not the lender
  //   gate): legacy lender sign flow, kept on the dual-write path for
  //   rollback compatibility (old table removed in Release 2).
  // No CTA while the state is loading, so review-only visitors never see a
  // transient Sign button.
  const isReview = touState === "signedCurrent" && isAgreementSigned
  const needsReacceptance =
    touState === "stale" ||
    touState === "staleWithinGrace" ||
    touState === "staleExpired" ||
    touState === "declined"
  const needsLenderSignature =
    touState === "neverSigned" ||
    (touState === "signedCurrent" && !isAgreementSigned)

  const handleDownload = () => {
    window.open(`/api/service-agreement/current/download`, "_blank")
  }
  return (
    <Box
      className="text"
      sx={{
        padding: "72px 0 3px",
        width: "100%",
        flex: "1 1 auto",
        minHeight: 0,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        display: "flex",
        justifyContent: "center",
        [theme.breakpoints.down("md")]: {
          padding: "32px 12px 12px",
          background: "white",
          borderRadius: "14px",
          height: "calc(100vh - 72px)",
        },
      }}
    >
      <Box
        sx={{
          maxWidth: "690px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          [theme.breakpoints.down("md")]: {
            justifyContent: "start",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            columnGap: "14px",
            rowGap: "8px",
            marginBottom: "24px",
            [theme.breakpoints.down("md")]: {
              flexWrap: "wrap",
              marginBottom: "16px",
            },
          }}
        >
          <Typography variant="title2" fontWeight={600} textAlign="center">
            <Trans i18nKey="agreement.page.title" />
          </Typography>
          <ServiceAgreementVersionChip version={currentAgreement?.version} />
        </Box>

        <AgreementText
          markdown={currentAgreement?.plaintext}
          isLoading={isAgreementLoading}
        />

        <Box
          sx={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: "0",
            height: "180px",
            width: "690px",
            backgroundImage:
              "linear-gradient(3deg, #FFFFFF 40%, #FFFFFF00 73%)",
            pointerEvents: "none",
            [theme.breakpoints.down("md")]: {
              width: "calc(100% - 8px)",
              paddingX: "6px",
              borderRadius: "14px",
            },
          }}
        />
      </Box>

      <Box
        sx={{
          position: "absolute",
          bottom: "0",
          width: "100%",
          justifyContent: "center",
          paddingBottom: "44px",
          display: "flex",
          gap: "16px",
          zIndex: 1,
          [theme.breakpoints.down("md")]: {
            paddingBottom: "12px",
            paddingX: "12px",
            gap: "6px",
            width: "100%",
          },
        }}
      >
        {isReview && (
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={() => router.back()}
            sx={{
              width: "168.63px",
              height: "44px",
              [theme.breakpoints.down("md")]: {
                width: "100%",
              },
            }}
          >
            <Trans i18nKey="agreement.page.cancel" />
          </Button>
        )}
        {needsReacceptance && <ReacceptButton />}
        {needsLenderSignature && <SignButton />}

        <Button
          variant="contained"
          color="secondary"
          size="large"
          onClick={handleDownload}
          sx={{
            width: "168.63px",
            height: "44px",
            [theme.breakpoints.down("md")]: {
              width: "100%",
            },
          }}
        >
          <Trans i18nKey="agreement.page.download" />
        </Button>
      </Box>
    </Box>
  )
}
