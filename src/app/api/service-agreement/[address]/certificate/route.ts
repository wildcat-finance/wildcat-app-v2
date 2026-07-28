import { createHash } from "crypto"

import JSZip from "jszip"
import { NextRequest, NextResponse } from "next/server"

import {
  BorrowerAcceptance,
  getLatestBorrowerAcceptance,
} from "@/lib/serviceAgreement"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

const buildRecordFile = (
  acceptance: BorrowerAcceptance,
  acceptedTermsTextAvailable: boolean,
): string => {
  const sa = acceptance.serviceAgreement
  const lines = [
    "Wildcat Terms of Use — Acceptance Record",
    "",
    `Account address:          ${acceptance.address}`,
    ...(acceptance.organizationName
      ? [`Organization name:        ${acceptance.organizationName}`]
      : []),
    `Network (chain ID):       ${acceptance.chainId}`,
    `Accepted version:         ${sa.version}`,
    `Effective date:           ${sa.effectiveDate.toISOString().slice(0, 10)}`,
    `Signed at (claimed):      ${acceptance.timeSigned.toISOString()} (UTC)`,
    `Recorded at (server):     ${acceptance.createdAt.toISOString()} (UTC)`,
    `SHA-256 of accepted ToU:  ${sa.plaintextSha256}`,
    ...(sa.legacyWrapperHash
      ? [`Acknowledgement hash:     ${sa.legacyWrapperHash}`]
      : []),
    "",
    ...(acceptedTermsTextAvailable
      ? [
          'The exact Terms of Use text that was accepted is in "Accepted Terms of Use.txt".',
        ]
      : [
          "The exact historical Terms of Use text is not retained in this legacy record.",
          'The stored legacy placeholder is in "Legacy Terms of Use Placeholder.txt".',
        ]),
    "The stored acceptance data, including the raw signature, is in",
    '"acceptance-record.json".',
  ]
  return lines.join("\n")
}

const buildReadme = (
  acceptedTermsTextAvailable: boolean,
) => `Wildcat Terms of Use — Acceptance Record

This ZIP is Wildcat's record that the account named in the files below accepted the
Wildcat Terms of Use.

Files:
- "Wildcat ToU Acceptance Record.txt": human-readable summary.
- "${
  acceptedTermsTextAvailable
    ? "Accepted Terms of Use.txt"
    : "Legacy Terms of Use Placeholder.txt"
}": ${
  acceptedTermsTextAvailable
    ? "the exact Terms of Use text that was accepted."
    : "the placeholder retained for this legacy record; it is not the exact historical text."
}
- "acceptance-record.json": the data Wildcat stored for this acceptance, including
  the raw signature.

Timestamps:
"Signed at (claimed)" is the time attested inside the wallet-signed message;
"Recorded at (server)" is when Wildcat's server stored the acceptance.

${
  acceptedTermsTextAvailable
    ? `Verifying the accepted document:
The SHA-256 of "Accepted Terms of Use.txt" equals the "plaintextSha256" value in
acceptance-record.json. Recompute it with:

    shasum -a 256 "Accepted Terms of Use.txt"`
    : `Legacy document limitation:
The exact historical text was not retained. The declared "plaintextSha256" is
preserved as historical metadata, while "storedPlaintextSha256" identifies the
placeholder included in this ZIP. These values intentionally do not match.`
}
`

/// GET /api/service-agreement/[address]/certificate?chainId=<chainId>
/// ZIP record of the borrower's latest ToU acceptance. Built only from stored
/// data - no signing key, no wallet. 404 when the borrower has no acceptance.
export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } },
) {
  const chainId = validateChainIdParam(request)
  if (!chainId) {
    return NextResponse.json({ error: "Invalid chain ID" }, { status: 400 })
  }
  const address = params.address.toLowerCase()
  const acceptance = await getLatestBorrowerAcceptance(chainId, address)
  if (!acceptance) {
    return new NextResponse(null, { status: 404 })
  }
  const sa = acceptance.serviceAgreement
  const storedPlaintextSha256 = createHash("sha256")
    .update(sa.plaintext)
    .digest("hex")
  const acceptedTermsTextAvailable =
    storedPlaintextSha256 === sa.plaintextSha256

  const record = {
    address: acceptance.address,
    chainId: acceptance.chainId,
    version: sa.version,
    plaintextSha256: sa.plaintextSha256,
    legacyWrapperHash: sa.legacyWrapperHash,
    organizationName: acceptance.organizationName,
    timeSigned: acceptance.timeSigned.toISOString(),
    recordedAt: acceptance.createdAt.toISOString(),
    kind: acceptance.kind,
    signature: acceptance.signature,
    signedMessage: acceptance.signedMessage,
    acknowledgementText: sa.acknowledgementText,
    acceptedTermsTextAvailable,
    storedPlaintextSha256,
  }

  const zip = new JSZip()
  zip.file(
    "Wildcat ToU Acceptance Record.txt",
    buildRecordFile(acceptance, acceptedTermsTextAvailable),
  )
  zip.file(
    acceptedTermsTextAvailable
      ? "Accepted Terms of Use.txt"
      : "Legacy Terms of Use Placeholder.txt",
    sa.plaintext,
  )
  zip.file("acceptance-record.json", JSON.stringify(record, null, 2))
  zip.file("README.txt", buildReadme(acceptedTermsTextAvailable))
  const zipBlob = await zip.generateAsync({ type: "blob" })

  return new NextResponse(zipBlob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="Wildcat ToU Acceptance -${address}.zip"`,
    },
  })
}

export const dynamic = "force-dynamic"
