"use client"

import { Button } from "@mui/material"
import { useEffect, useState } from "react"
import { useSignAgreement } from "@/app/[locale]/agreement/hooks/useSignAgreement"
import { useSubmitSignature } from "@/app/[locale]/agreement/hooks/useSubmitSignature"
import { useAccount } from "wagmi"
import dayjs from "dayjs"

const DATE_FORMAT = "MMMM DD, YYYY"

export const SignButton = () => {
  const address = useAccount().address?.toLowerCase()

  const { mutateAsync: signAgreement } = useSignAgreement()
  const { mutateAsync: submitSignature } = useSubmitSignature()

  const [dateSigned, setDateSigned] = useState<string>("")

  const organization = "Wildcat Finance"

  useEffect(() => {
    setDateSigned(dayjs(Date.now()).format(DATE_FORMAT))
  })

  const handleSign = async () => {
    const result = await signAgreement({
      name: organization,
      dateSigned,
      address,
    })
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
      // console.log(await sdk?.txs.getBySafeTxHash(result.safeTxHash))
      // setSafeTxHash(result.safeTxHash)
    }
  }

  return (
    <Button
      variant="contained"
      size="large"
      sx={{ width: "168.63px", height: "44px" }}
      onClick={handleSign}
    >
      Sign and continue
    </Button>
  )
}
