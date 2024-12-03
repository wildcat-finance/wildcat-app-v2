import { useEffect, useState } from "react"

import { Button } from "@mui/material"
import dayjs from "dayjs"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useSignAgreement } from "@/app/[locale]/agreement/hooks/useSignAgreement"

const DATE_FORMAT = "MMMM DD, YYYY"

export const SignButton = () => {
  const address = useAccount().address?.toLowerCase()
  const { t } = useTranslation()

  const { mutate: signAgreement, isPending: isSignPending } = useSignAgreement()

  const [dateSigned, setDateSigned] = useState<string>("")

  const organization = "Wildcat Finance"

  useEffect(() => {
    setDateSigned(dayjs(Date.now()).format(DATE_FORMAT))
  }, [])

  const isSigning = isSignPending

  const handleSign = () => {
    signAgreement({
      name: organization,
      dateSigned,
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
