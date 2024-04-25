"use client"

import { useEffect, useState } from "react"

import { Button } from "@mui/material"
import dayjs from "dayjs"
import { useAccount } from "wagmi"

import { useSignAgreement } from "@/app/[locale]/agreement/hooks/useSignAgreement"
import { useSubmitSignature } from "@/app/[locale]/agreement/hooks/useSubmitSignature"
import { useGnosisSafeSDK } from "@/hooks/useGnosisSafeSDK"

const DATE_FORMAT = "MMMM DD, YYYY"

export const SignButton = () => {
  const address = useAccount().address?.toLowerCase()
  const { sdk } = useGnosisSafeSDK()

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
      {isSigning ? "Signing..." : "Sign and continue"}
    </Button>
  )
}
