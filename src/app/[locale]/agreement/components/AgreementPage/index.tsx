"use client"

import { useState } from "react"

import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  useTheme,
} from "@mui/material"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Trans } from "react-i18next"

import type { ServiceAgreementPartyInput } from "@/app/api/service-agreement/interface"
import {
  ServiceAgreementChip,
  ServiceAgreementVersionChip,
} from "@/components/ServiceAgreementVersionChip"
import { useCurrentServiceAgreement } from "@/hooks/useCurrentServiceAgreement"
import { useNetworkGate } from "@/hooks/useNetworkGate"
import {
  useServiceAgreementVersion,
  useServiceAgreementVersions,
} from "@/hooks/useServiceAgreementVersions"
import { dayjs } from "@/utils/dayjs"
import { formatServiceAgreementVersionLabel } from "@/utils/serviceAgreementVersions"

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
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const requestedVersion = searchParams.get("version")
  const currentQuery = useCurrentServiceAgreement()
  const currentAgreement = currentQuery.data
  // Treat an explicit selection as historical until the current version is
  // known. Never fall back to current text or signing while history loads.
  const isHistorical =
    requestedVersion !== null && requestedVersion !== currentAgreement?.version
  const historicalQuery = useServiceAgreementVersion(
    isHistorical ? requestedVersion : null,
  )
  const versionsQuery = useServiceAgreementVersions()
  const displayedQuery = isHistorical ? historicalQuery : currentQuery
  const displayedAgreement = displayedQuery.data
  const displayedVersion = requestedVersion ?? currentAgreement?.version
  const { touState, touCurrentVersion, touAcceptedVersion } = useNetworkGate({
    agreementParty: party,
  })
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const canSign =
    !isHistorical &&
    displayedQuery.isSuccess &&
    !!displayedAgreement &&
    displayedAgreement.version === touCurrentVersion?.version &&
    displayedAgreement.plaintextSha256 === touCurrentVersion?.plaintextSha256

  const selectVersion = (version?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!version || version === currentAgreement?.version) {
      params.delete("version")
    } else {
      params.set("version", version)
    }
    setMenuAnchor(null)
    // Switching documents replaces this page's selection. Back/Cancel still
    // returns to the page that opened the terms, rather than every selection.
    const query = params.toString()
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false })
  }

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
    if (!displayedAgreement || !displayedQuery.isSuccess) return
    window.open(
      `/api/service-agreement/versions/${encodeURIComponent(
        displayedAgreement.version,
      )}/download`,
      "_blank",
      "noopener,noreferrer",
    )
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
          <Button
            variant="text"
            aria-label="Choose Terms of Use version"
            aria-haspopup="menu"
            aria-expanded={!!menuAnchor}
            aria-controls={menuAnchor ? "terms-version-menu" : undefined}
            onClick={(event) => setMenuAnchor(event.currentTarget)}
            sx={{ minWidth: 0, padding: "4px", height: "auto", gap: "4px" }}
          >
            {displayedVersion ? (
              <ServiceAgreementVersionChip
                version={displayedVersion}
                tone={isHistorical ? "stale" : "current"}
              />
            ) : (
              "Versions"
            )}
            <span aria-hidden="true">▾</span>
          </Button>
          <Menu
            id="terms-version-menu"
            anchorEl={menuAnchor}
            open={!!menuAnchor}
            onClose={() => setMenuAnchor(null)}
            MenuListProps={{ "aria-label": "Terms of Use versions" }}
          >
            {versionsQuery.isLoading && <MenuItem disabled>Loading…</MenuItem>}
            {versionsQuery.isError && (
              <MenuItem onClick={() => versionsQuery.refetch()}>
                Unable to load versions. Retry
              </MenuItem>
            )}
            {versionsQuery.data?.map((version) => (
              <MenuItem
                key={version.version}
                selected={version.version === displayedVersion}
                disabled={!version.isAvailable}
                onClick={() => selectVersion(version.version)}
                sx={{ gap: "8px", flexWrap: "wrap", whiteSpace: "normal" }}
              >
                {formatServiceAgreementVersionLabel(version.version)}
                <ServiceAgreementChip
                  label={dayjs(version.effectiveDate)
                    .utc()
                    .format("DD MMM YYYY")}
                />
                {version.isCurrent && <ServiceAgreementChip label="Current" />}
                {version.version === touAcceptedVersion?.version &&
                  version.plaintextSha256 ===
                    touAcceptedVersion.plaintextSha256 && (
                    <ServiceAgreementChip label="Accepted" />
                  )}
                {!version.isAvailable && <span>Unavailable</span>}
              </MenuItem>
            ))}
          </Menu>
        </Box>

        {isHistorical && (
          <Typography variant="text3" color="text.secondary" sx={{ mb: 2 }}>
            {displayedQuery.isSuccess && displayedAgreement
              ? `You’re viewing ${formatServiceAgreementVersionLabel(
                  displayedAgreement.version,
                )} (${dayjs(displayedAgreement.effectiveDate)
                  .utc()
                  .format("DD MMM YYYY")}). This is not the current version. `
              : "You’ve selected a previous or unavailable version. "}
            <Button variant="text" onClick={() => selectVersion()}>
              View current
            </Button>
          </Typography>
        )}

        {displayedQuery.isError ? (
          <Box role="alert">
            <Typography variant="text3">
              {isHistorical
                ? "This Terms of Use version is unavailable. Its original text may be missing, or it could not be loaded."
                : "The current Terms of Use could not be loaded."}
            </Typography>
            <Button variant="text" onClick={() => displayedQuery.refetch()}>
              Retry
            </Button>
          </Box>
        ) : (
          <AgreementText
            key={displayedAgreement?.version ?? requestedVersion}
            markdown={displayedAgreement?.plaintext}
            isLoading={displayedQuery.isLoading}
          />
        )}

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
        {(isReview || isHistorical || displayedQuery.isError) && (
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
        {canSign && needsReacceptance && <ReacceptButton party={party} />}
        {canSign && needsLenderSignature && <SignButton />}

        <Button
          variant="contained"
          color="secondary"
          size="large"
          onClick={handleDownload}
          disabled={!displayedAgreement || !displayedQuery.isSuccess}
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
