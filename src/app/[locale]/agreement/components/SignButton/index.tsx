import { useEffect, useState } from "react"

import { Button, useTheme } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useSignAgreement } from "@/app/[locale]/agreement/hooks/useSignAgreement"

export const SignButton = () => {
  const address = useAccount().address?.toLowerCase()
  const { t } = useTranslation()
  const theme = useTheme()

  const {
    mutate: signAgreement,
    isPending: isSignPending,
    isAgreementLoading,
  } = useSignAgreement()

  const [timeSigned, setTimeSigned] = useState<number>()

  const organization = "Wildcat Foundation"

  useEffect(() => {
    setTimeSigned(Date.now())
  }, [])

  const isSigning = isSignPending || isAgreementLoading

  const handleSign = () => {
    signAgreement({
      name: organization,
      timeSigned,
      address,
    })
  }

  return (
    <Button
      variant="contained"
      size="large"
      sx={{
        width: "169",
        height: "44px",
        [theme.breakpoints.down("md")]: {
          width: "100%",
        },
      }}
      onClick={handleSign}
      disabled={isSigning || !timeSigned}
    >
      {isSigning
        ? t("agreement.signButton.signing")
        : t("agreement.signButton.sign")}
    </Button>
  )
}
