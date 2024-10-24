"use client"

import { useEffect, useState } from "react"

import { Button } from "@mui/material"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import dayjs from "dayjs"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useSignAgreement } from "@/app/[locale]/agreement/hooks/useSignAgreement"
import { useSubmitSignature } from "@/app/[locale]/agreement/hooks/useSubmitSignature"

const DATE_FORMAT = "MMMM DD, YYYY"

export const SignButton = () => {
  const address = useAccount().address?.toLowerCase()
  const { sdk } = useSafeAppsSDK()
  const { t } = useTranslation()

  const { mutateAsync: signAgreement, isPending: isSignPending } =
    useSignAgreement()
  const { mutateAsync: submitSignature, isPending: isSumbitPending } =
    useSubmitSignature()

  const [dateSigned, setDateSigned] = useState<string>("")

  const organization = "Wildcat Finance"

  useEffect(() => {
    setDateSigned(dayjs(Date.now()).format(DATE_FORMAT))
  }, [])

  const isSigning = isSignPending || isSumbitPending

  const handleSign = async () => {
    const result = await signAgreement({
      name: organization,
      dateSigned,
      address,
    })
    console.log(result)

    if (result.signature) {
      console.log({
        signature: result.signature,
        name: organization,
        dateSigned,
        address: address as string,
      })
      await submitSignature({
        signature: result.signature,
        name: organization,
        dateSigned,
        address: address as string,
      })
    } else if (result.safeTxHash) {
      console.log(await sdk?.txs.getBySafeTxHash(result.safeTxHash))
    }
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
