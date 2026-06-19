"use client"

import { useEffect, useState } from "react"

import { Box, Button, InputBase, Typography } from "@mui/material"
import Link from "next/link"
import { Trans } from "react-i18next"

import { AgreementText } from "@/app/[locale]/agreement/components/AgreementText"
import { useGetServiceAgreementStatus } from "@/app/[locale]/borrower/hooks/useGetServiceAgreementStatus"
import { BorrowerInvitation } from "@/app/api/invite/interface"
import { formatServiceAgreementVersionLabel } from "@/utils/serviceAgreementVersions"

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
  InvitationDivider,
  InvitationHeader,
  InvitationPageContainer,
  TermsBody,
  TermsHeader,
  TermsPanel,
  TermsTitle,
  TermsVersionChip,
} from "../../style"

export const AcceptInvitationForm = ({
  invitation,
  address,
}: {
  invitation: BorrowerInvitation
  address: string
}) => {
  const [name, setName] = useState(invitation.name || "")
  const submitMutation = useSubmitAcceptInvitation()
  const [timeSigned, setTimeSigned] = useState<number>()
  const { data: serviceAgreementStatus } = useGetServiceAgreementStatus(address)
  const currentAgreementVersion = serviceAgreementStatus?.current.version

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
          <Typography variant="title1Highlighted">
            Accept Borrower Invitation
          </Typography>
        </Box>
        <Box sx={InvitationDivider} />

        <Box sx={BorrowerNameField}>
          <Typography
            variant="text2Highlighted"
            fontWeight={600}
            sx={BorrowerNameLabel}
          >
            Borrower name
          </Typography>
          <InputBase
            inputProps={{ "aria-label": "Borrower name" }}
            sx={BorrowerNameInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Box>
        <Typography variant="text3" sx={BorrowerNameNote}>
          This name is appended to the signed Terms of Use acknowledgement and
          recorded as the <strong>borrower organization</strong> accepting the
          invitation.
        </Typography>

        <Box sx={TermsPanel}>
          <Box sx={TermsHeader}>
            <Box sx={TermsTitle}>
              <Typography variant="title3" fontWeight={600} textAlign="center">
                <Trans i18nKey="agreement.page.title" />
              </Typography>
              {currentAgreementVersion && (
                <Box sx={TermsVersionChip}>
                  {formatServiceAgreementVersionLabel(currentAgreementVersion)}
                </Box>
              )}
            </Box>
          </Box>
          <Box sx={TermsBody}>
            <AgreementText sx={AgreementTextScroll} />
          </Box>
        </Box>
      </Box>

      <Box sx={InvitationActions}>
        <Box sx={InvitationActionsInner}>
          <Button
            component={Link}
            href="/pdf/Wildcat_Terms_of_Use.pdf"
            target="_blank"
            download
            variant="contained"
            color="secondary"
            size="large"
            sx={ActionButton}
          >
            <Trans i18nKey="agreement.page.download" />
          </Button>

          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={!name || submitMutation.isPending}
            sx={ActionButton}
          >
            {submitMutation.isPending ? "Signing..." : "Sign & Accept"}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
