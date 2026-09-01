"use client"

import { useEffect, useState } from "react"

import { Box, Button, InputBase, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { AgreementText } from "@/app/[locale]/agreement/components/AgreementText"
import { BorrowerInvitation } from "@/app/api/invite/interface"
import { ServiceAgreementVersionChip } from "@/components/ServiceAgreementVersionChip"
import { Trans } from "@/components/Translation"
import { useCurrentServiceAgreement } from "@/hooks/useCurrentServiceAgreement"

import { useSubmitAcceptInvitation } from "../../hooks/useSubmitAcceptInvitation"
import {
  ActionButton,
  AgreementTextScroll,
  BorrowerNameField,
  BorrowerNameInput,
  BorrowerNameLabel,
  BorrowerNameNote,
  InvitationActions,
  InvitationActionsInner,
  InvitationContent,
  InvitationHeader,
  InvitationPageContainer,
  TermsBody,
  TermsHeader,
  TermsPanel,
  TermsTitle,
} from "../../style"

export const AcceptInvitationForm = ({
  invitation,
  address,
}: {
  invitation: BorrowerInvitation
  address: string
}) => {
  const { t } = useTranslation()

  const [name, setName] = useState(invitation.name || "")
  const submitMutation = useSubmitAcceptInvitation()
  const [timeSigned, setTimeSigned] = useState<number>()
  const { data: currentAgreement, isLoading: isAgreementLoading } =
    useCurrentServiceAgreement()
  const currentAgreementVersion = currentAgreement?.version

  useEffect(() => {
    setTimeSigned(Date.now())
  }, [])

  const handleSubmit = () => {
    submitMutation.mutate({
      address,
      name,
      timeSigned,
    })
  }

  return (
    <Box sx={InvitationPageContainer}>
      <Box sx={InvitationContent}>
        <Box sx={InvitationHeader}>
          <Typography variant="title2" fontWeight={600} textAlign="center">
            {t("borrower.invitation.acceptBorrowerInvitation")}
          </Typography>
        </Box>

        <Box sx={BorrowerNameField}>
          <Typography
            variant="text2Highlighted"
            fontWeight={600}
            sx={BorrowerNameLabel}
          >
            {t("common.labels.borrowerName")}
          </Typography>
          <InputBase
            inputProps={{ "aria-label": "Borrower name" }}
            sx={BorrowerNameInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Box>
        <Typography variant="text3" sx={BorrowerNameNote}>
          <Trans
            i18nKey="borrower.invitation.nameHelper"
            components={{ 1: <strong /> }}
          />
        </Typography>

        <Box sx={TermsPanel}>
          <Box sx={TermsHeader}>
            <Box sx={TermsTitle}>
              <Typography variant="title3" fontWeight={600} textAlign="center">
                <Trans i18nKey="agreement.page.title" />
              </Typography>
              <ServiceAgreementVersionChip version={currentAgreementVersion} />
            </Box>
          </Box>
          <Box sx={TermsBody}>
            <AgreementText
              markdown={currentAgreement?.plaintext}
              isLoading={isAgreementLoading}
              sx={AgreementTextScroll}
            />
          </Box>
        </Box>
      </Box>

      <Box sx={InvitationActions}>
        <Box sx={InvitationActionsInner}>
          <Button
            component={Link}
            href="/api/service-agreement/current/download"
            target="_blank"
            download
            variant="contained"
            color="secondary"
            size="large"
            sx={ActionButton}
          >
            <Trans i18nKey="common.buttons.download" />
          </Button>

          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={
              !name ||
              !timeSigned ||
              !currentAgreement ||
              submitMutation.isPending ||
              submitMutation.isAgreementLoading
            }
            sx={ActionButton}
          >
            {submitMutation.isPending
              ? t("common.buttons.signing")
              : t("borrower.invitation.signAccept")}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
