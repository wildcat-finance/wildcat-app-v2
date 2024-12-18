import { useEffect, useState } from "react"

import { Button } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useSignAgreement } from "@/app/[locale]/agreement/hooks/useSignAgreement"

export const SignButton = () => {
  const address = useAccount().address?.toLowerCase()
  const { t } = useTranslation()

  const { mutate: signAgreement, isPending: isSignPending } = useSignAgreement()

  const [timeSigned, setTimeSigned] = useState<number>()

  const organization = "Wildcat Finance"

  useEffect(() => {
    setTimeSigned(Date.now())
  }, [])

  const isSigning = isSignPending

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
      sx={{ width: "169", height: "44px" }}
      onClick={handleSign}
      disabled={isSigning}
    >
      {isSigning
        ? t("agreement.signButton.signing")
        : t("agreement.signButton.sign")}
    </Button>
  )
}
