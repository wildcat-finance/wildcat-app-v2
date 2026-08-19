"use client"

import * as React from "react"
import { useEffect, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  Divider,
  SvgIcon,
  Typography,
} from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import ArrowRightIcon from "@/assets/icons/arrowRight_icon.svg"
import CheckIcon from "@/assets/icons/check_icon.svg"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { COLORS } from "@/theme/colors"

import {
  VerificationDisclosureVariant,
  VerificationList,
  VerificationModalDialog,
  VerificationModalFieldGroup,
  VerificationModalLists,
  VerificationNoteContainer,
  VerificationSectionHeader,
} from "./style"

const ACKNOWLEDGEMENT_STORAGE_KEY =
  "borrower_profile_verification_acknowledged_v1"

const VERIFIED_FIELD_KEYS = [
  "borrowerProfile.profile.verification.fields.verified.legalName",
  "borrowerProfile.profile.verification.fields.verified.borrowerAddress",
  "borrowerProfile.profile.verification.fields.verified.headquarters",
  "borrowerProfile.profile.verification.fields.verified.entityLegalForm",
  "borrowerProfile.profile.verification.fields.verified.founded",
] as const

const UNVERIFIED_FIELD_KEYS = [
  "borrowerProfile.profile.verification.fields.unverified.alias",
  "borrowerProfile.profile.verification.fields.unverified.profileDescription",
  "borrowerProfile.profile.verification.fields.unverified.outgoingLinks",
  "borrowerProfile.profile.verification.fields.unverified.marketDescription",
] as const

type BorrowerProfileVerificationDisclosureProps = {
  variant?: VerificationDisclosureVariant
  showModal?: boolean
  showNote?: boolean
}

type FieldListProps = {
  fieldKeys: readonly string[]
  color: string
  compact?: boolean
}

const FieldList = ({ fieldKeys, color, compact }: FieldListProps) => {
  const { t } = useTranslation()

  return (
    <Box component="ul" sx={{ ...VerificationList(compact), color }}>
      {fieldKeys.map((fieldKey) => (
        <Typography
          key={fieldKey}
          component="li"
          variant="text3"
          color={COLORS.bunker}
          sx={{
            "&::marker": { color },
            ...(compact
              ? {
                  fontSize: "12px",
                  lineHeight: "18px",
                }
              : {}),
          }}
        >
          {t(fieldKey)}
        </Typography>
      ))}
    </Box>
  )
}

const VerificationBadge = ({ verified }: { verified: boolean }) => (
  <SvgIcon
    sx={{
      fontSize: "16px",
      "& path": verified ? { fill: "#1B9B16" } : { stroke: COLORS.santasGrey },
    }}
  >
    {verified ? <CheckIcon /> : <ArrowRightIcon />}
  </SvgIcon>
)

const VerificationGroupHeading = ({
  verified,
  compact,
  children,
}: React.PropsWithChildren<{ verified: boolean; compact?: boolean }>) => (
  <Box sx={VerificationSectionHeader(compact)}>
    {verified ? (
      <VerificationBadge verified />
    ) : (
      <Typography variant="text3" color={COLORS.santasGrey}>
        -
      </Typography>
    )}

    <Typography
      variant="text4Highlighted"
      color={verified ? "#1B9B16" : COLORS.santasGrey}
      textTransform="uppercase"
      sx={
        compact
          ? {
              fontSize: "10px",
              lineHeight: "14px",
            }
          : undefined
      }
    >
      {children}
    </Typography>
  </Box>
)

export const BorrowerProfileVerificationDisclosure = ({
  variant = "desktop",
  showModal = true,
  showNote = true,
}: BorrowerProfileVerificationDisclosureProps) => {
  const { t } = useTranslation()
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (!showModal) return

    try {
      setIsModalOpen(
        localStorage.getItem(ACKNOWLEDGEMENT_STORAGE_KEY) !== "true",
      )
    } catch {
      setIsModalOpen(true)
    }
  }, [showModal])

  const acknowledgeDisclosure = () => {
    try {
      localStorage.setItem(ACKNOWLEDGEMENT_STORAGE_KEY, "true")
    } catch {
      // Keep the acknowledgement usable if storage is unavailable.
    }

    setIsModalOpen(false)
  }

  const compactNote = variant !== "inline"
  const noteBodyTextSx = compactNote
    ? {
        fontSize: "12px",
        lineHeight: "18px",
      }
    : undefined

  return (
    <>
      {showNote && (
        <Box
          component="aside"
          aria-labelledby="borrower-profile-verification-title"
          sx={VerificationNoteContainer(variant)}
        >
          <Typography
            id="borrower-profile-verification-title"
            component="p"
            variant="text2Highlighted"
            color={COLORS.bunker}
            sx={
              compactNote
                ? {
                    fontSize: "13px",
                    lineHeight: "18px",
                  }
                : undefined
            }
          >
            {t("borrowerProfile.profile.verification.title")}
          </Typography>

          <Typography
            variant="text3"
            color={COLORS.matteSilver}
            marginTop={compactNote ? "10px" : "16px"}
            sx={noteBodyTextSx}
          >
            {t("borrowerProfile.profile.verification.noteIntro")}
          </Typography>

          <Box marginTop={compactNote ? "12px" : "18px"}>
            <VerificationGroupHeading verified compact={compactNote}>
              {t("borrowerProfile.profile.verification.verifiedHeading")}
            </VerificationGroupHeading>
            <FieldList
              fieldKeys={VERIFIED_FIELD_KEYS}
              color="#1B9B16"
              compact={compactNote}
            />
          </Box>

          <Divider sx={{ marginY: compactNote ? "12px" : "18px" }} />

          <Box>
            <VerificationGroupHeading verified={false} compact={compactNote}>
              {t("borrowerProfile.profile.verification.unverifiedHeading")}
            </VerificationGroupHeading>
            <FieldList
              fieldKeys={UNVERIFIED_FIELD_KEYS}
              color={COLORS.greySuit}
              compact={compactNote}
            />
          </Box>

          <Typography
            component="p"
            variant="text3"
            color={COLORS.matteSilver}
            marginTop={compactNote ? "10px" : "14px"}
            sx={noteBodyTextSx}
          >
            {t("borrowerProfile.profile.verification.noEndorsement")}
          </Typography>

          <Button
            component={Link}
            href={EXTERNAL_LINKS.BORROWER_ONBOARDING}
            target="_blank"
            rel="noopener noreferrer"
            variant="text"
            size="small"
            sx={{
              marginTop: compactNote ? "10px" : "14px",
              padding: 0,
              minWidth: 0,
              gap: "6px",
              display: "flex",
              width: "fit-content",
              fontSize: compactNote ? "12px" : undefined,
              lineHeight: compactNote ? "18px" : undefined,
              justifyContent: "flex-start",
              color: COLORS.blueRibbon,
              "&:hover": {
                backgroundColor: "transparent",
              },
            }}
          >
            {t("borrowerProfile.profile.verification.detailsLink")}
            <SvgIcon
              sx={{
                fontSize: "11px",
                "& path": { stroke: COLORS.blueRibbon },
              }}
            >
              <ArrowRightIcon />
            </SvgIcon>
          </Button>
        </Box>
      )}

      {showModal && (
        <Dialog
          open={isModalOpen}
          sx={VerificationModalDialog}
          aria-labelledby="borrower-profile-verification-modal-title"
        >
          <Typography
            id="borrower-profile-verification-modal-title"
            variant="title2"
            color={COLORS.bunker}
          >
            {t("borrowerProfile.profile.verification.modalTitle")}
          </Typography>

          <Typography variant="text2" color={COLORS.blackRock} marginTop="16px">
            {t("borrowerProfile.profile.verification.modalIntro")}
          </Typography>

          <Box sx={VerificationModalLists} marginTop="20px">
            <Box sx={VerificationModalFieldGroup}>
              <VerificationGroupHeading verified>
                {t("borrowerProfile.profile.verification.verifiedHeading")}
              </VerificationGroupHeading>
              <FieldList fieldKeys={VERIFIED_FIELD_KEYS} color="#1B9B16" />
            </Box>

            <Box sx={VerificationModalFieldGroup}>
              <VerificationGroupHeading verified={false}>
                {t("borrowerProfile.profile.verification.unverifiedHeading")}
              </VerificationGroupHeading>
              <FieldList
                fieldKeys={UNVERIFIED_FIELD_KEYS}
                color={COLORS.greySuit}
              />
            </Box>
          </Box>

          <Typography
            variant="text3"
            color={COLORS.matteSilver}
            marginTop="20px"
          >
            {t("borrowerProfile.profile.verification.modalNoEndorsement")}
          </Typography>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={acknowledgeDisclosure}
            sx={{ marginTop: "24px" }}
          >
            {t("borrowerProfile.profile.verification.acknowledge")}
          </Button>
        </Dialog>
      )}
    </>
  )
}
