import { toUtf8Bytes, keccak256 } from "ethers/lib/utils"
import JSZip from "jszip"
import { NextRequest, NextResponse } from "next/server"

import { ACCEPT_MLA_MESSAGE } from "@/config/mla-acceptance"
import { getSignedMasterLoanAgreement, prisma } from "@/lib/db"
import {
  fillInMlaForLender,
  formatAddress,
  getFieldValuesForLender,
} from "@/lib/mla"
import { formatSignatureText } from "@/lib/signatures"
import { VerifiedSignature } from "@/lib/signatures/interface"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

const getReadmeFile = ({
  market,
  lenderMessage,
  borrowerMessage,
  borrowerSignature,
  lenderSignature,
}: {
  market: string
  borrowerMessage: string
  lenderMessage: string
  borrowerSignature: VerifiedSignature
  lenderSignature: VerifiedSignature
}) => `MLA Signature Verification

This folder contains three files needed to verify the signatures on the MLA:
1. \`Borrower Signed MLA.txt\`: The version of the MLA that the borrower signed. This version includes the parameters the market had at deployment, but does not include any lender details (such as the address or the time of the signature).
2. \`Lender Signed MLA.txt\`: The version of the MLA that the lender signed. This version includes the parameters the market had at deployment, as well as the lender's address and the time of the signature.
3. \`README.md\`: This file, which contains the signatures of the borrower and the lender.

The message that was signed by each party is the following string:

"${ACCEPT_MLA_MESSAGE.replace("{{market}}", formatAddress(market) as string)}"

Where "{{hash}}" should be replaced with the keccak256 hash of the correct version of the MLA.


-----BORROWER SIGNATURE-----

For the borrower, the signed message (after replacing "{{hash}}") is:

"${borrowerMessage}"

${formatSignatureText(borrowerSignature)}

-----LENDER SIGNATURE-----

For the lender, the signed message (after replacing "{{hash}}") is:

"${lenderMessage}"

${formatSignatureText(lenderSignature)}`

/// GET /api/mla/[market]?chainId=<chainId>
/// Route to get the MLA for a given market.
export async function GET(
  request: NextRequest,
  { params }: { params: { market: string; lender: string } },
) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const market = params.market.toLowerCase()
  const lenderAddress = params.lender.toLowerCase()
  const mla = await getSignedMasterLoanAgreement(market, chainId)

  if (!mla) {
    return new NextResponse(null, { status: 404 })
  }
  if (!mla.borrowerSignature) {
    // This is a 500 error because the borrower signature should always be present.
    return new NextResponse(null, { status: 500 })
  }

  const mlaSignature = await prisma.mlaSignature.findFirst({
    where: {
      chainId,
      address: lenderAddress,
      market,
    },
  })
  if (!mlaSignature) {
    return NextResponse.json(
      { error: "MLA signature not found" },
      { status: 404 },
    )
  }

  const timeSigned = +mlaSignature.timeSigned
  const values = getFieldValuesForLender(lenderAddress, timeSigned)
  const { plaintext, message } = fillInMlaForLender(mla, values, market)
  const borrowerSignature = mla.borrowerSignature!

  const zip = new JSZip()
  zip.file("Borrower Signed MLA.txt", mla.plaintext)
  zip.file("Lender Signed MLA.txt", plaintext)
  // const result = [
  //   `-----BEGIN BORROWER SIGNATURE-----`,
  //   formatSignatureText(borrowerSignature as VerifiedSignature),
  //   `-----END BORROWER SIGNATURE-----`,
  //   ``,
  //   `-----BEGIN LENDER SIGNATURE-----`,
  //   formatSignatureText(mlaSignature as VerifiedSignature),
  //   `-----END LENDER SIGNATURE-----`,
  // ].join("\n")
  // zip.file("signatures.txt", result)
  const borrowerMessage = ACCEPT_MLA_MESSAGE.replace(
    "{{market}}",
    formatAddress(market) as string,
  ).replace("{{hash}}", keccak256(toUtf8Bytes(mla.plaintext)))
  const readme = getReadmeFile({
    market,
    borrowerMessage,
    lenderMessage: message,
    borrowerSignature: borrowerSignature as VerifiedSignature,
    lenderSignature: mlaSignature as VerifiedSignature,
  })
  zip.file("README.txt", readme)
  const zipBlob = await zip.generateAsync({ type: "blob" })

  return new NextResponse(zipBlob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="Master Loan Agreement Signed -${market}-${lenderAddress}.zip"`,
    },
  })
}

export const dynamic = "force-dynamic"
