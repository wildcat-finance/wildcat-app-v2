"use client"

import { useEffect, useState } from "react"

import { Box, Button, TextField, Typography } from "@mui/material"
import Link from "next/link"
import { Trans } from "react-i18next"
import { useAccount } from "wagmi"

import { AgreementText } from "@/app/[locale]/agreement/components/AgreementText"
import { BorrowerInvitation } from "@/app/api/invite/interface"

import { useBorrowerInvitation } from "../../../hooks/useBorrowerInvitation"
import { useSubmitAcceptInvitation } from "../../hooks/useSubmitAcceptInvitation"
// import { useBorrowerInvitation } from "@/hooks/useBorrowerInvitation"

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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h4">Accept Invitation</Typography>

      <TextField
        label="Organization Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
      />

      {/* <Box sx={{ bgcolor: "background.paper", p: 3, borderRadius: 1 }}>
        <AgreementText />
      </Box> */}

      <Box
        sx={{
          maxWidth: "690px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="title2" fontWeight={600} marginBottom="24px">
          <Trans i18nKey="agreement.page.title" />
        </Typography>

        <AgreementText />

        <Box
          sx={{
            position: "absolute",
            bottom: "0",
            height: "256px",
            width: "690px",
            backgroundImage:
              "linear-gradient(3deg, #FFFFFF 40%, #FFFFFF00 73%)",
            pointerEvents: "none",
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
        }}
      >
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!name || submitMutation.isPending}
        >
          {submitMutation.isPending ? "Signing..." : "Sign & Accept"}
        </Button>

        <Link
          href="/pdf/Wildcat_Protocol_Services_Agreement.pdf"
          target="_blank"
          download
        >
          <Button
            variant="contained"
            color="secondary"
            size="large"
            sx={{ width: "168.63px", height: "44px" }}
          >
            <Trans i18nKey="agreement.page.download" />
          </Button>
        </Link>
      </Box>
    </Box>
  )
}
