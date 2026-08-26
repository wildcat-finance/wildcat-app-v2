"use client"

import { Box, Button, Typography, useTheme } from "@mui/material"
import { useRouter } from "next/navigation"
import { Trans } from "react-i18next"

import type { ServiceAgreementPartyInput } from "@/app/api/service-agreement/interface"
import { ServiceAgreementVersionChip } from "@/components/ServiceAgreementVersionChip"
import { useCurrentServiceAgreement } from "@/hooks/useCurrentServiceAgreement"
import { useNetworkGate } from "@/hooks/useNetworkGate"
import { currentReturnTarget } from "@/utils/returnTarget"

import { AgreementText } from "../AgreementText"
import { ReacceptButton } from "../ReacceptButton"
import { SignButton } from "../SignButton"

export const AgreementPage = ({
  party,
}: {
  party: ServiceAgreementPartyInput
}) => {
  const theme = useTheme()
  const router = useRouter()
  const { data: currentAgreement, isLoading: isAgreementLoading } =
    useCurrentServiceAgreement()
  const { touState } = useNetworkGate({ agreementParty: party })

  // Lenders retain the initial onboarding flow, while borrowers only reach
  // this page to review or re-accept terms for their borrower capacity.
  const isReview = touState === "signedCurrent"
  const needsReacceptance =
    touState === "stale" ||
    touState === "staleWithinGrace" ||
    touState === "staleExpired" ||
    touState === "declined" ||
    (party === "Borrower" && touState === "neverSigned")
  const needsLenderSignature = party === "Lender" && touState === "neverSigned"

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
            onClick={() => router.push(currentReturnTarget(party))}
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
        {needsReacceptance && <ReacceptButton party={party} />}
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
