import JSZip from "jszip"
import { NextRequest, NextResponse } from "next/server"

import {
  BorrowerAcceptance,
  getLatestBorrowerAcceptance,
} from "@/lib/serviceAgreement"
import { validateChainIdParam } from "@/lib/validateChainIdParam"

const buildRecordFile = (acceptance: BorrowerAcceptance): string => {
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
    `Acceptance timestamp:     ${acceptance.timeSigned.toISOString()} (UTC)`,
    `SHA-256 of accepted ToU:  ${sa.plaintextSha256}`,
    ...(sa.legacyWrapperHash
      ? [`Acknowledgement hash:     ${sa.legacyWrapperHash}`]
      : []),
    "",
    'The exact Terms of Use text that was accepted is in "Accepted Terms of Use.txt".',
    "The stored acceptance data, including the raw signature, is in",
    '"acceptance-record.json".',
  ]
  return lines.join("\n")
}

const README = `Wildcat Terms of Use — Acceptance Record

This ZIP is Wildcat's record that the account named in the files below accepted the
Wildcat Terms of Use.

Files:
- "Wildcat ToU Acceptance Record.txt": human-readable summary.
- "Accepted Terms of Use.txt": the exact Terms of Use text that was accepted.
- "acceptance-record.json": the data Wildcat stored for this acceptance, including
  the raw signature.

Verifying the accepted document:
The SHA-256 of "Accepted Terms of Use.txt" equals the "plaintextSha256" value in
acceptance-record.json (and the hash embedded in the signed acknowledgement). Recompute it with:

    shasum -a 256 "Accepted Terms of Use.txt"
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

  const record = {
    address: acceptance.address,
    chainId: acceptance.chainId,
    version: sa.version,
    plaintextSha256: sa.plaintextSha256,
    legacyWrapperHash: sa.legacyWrapperHash,
    organizationName: acceptance.organizationName,
    timeSigned: acceptance.timeSigned.toISOString(),
    kind: acceptance.kind,
    signature: acceptance.signature,
    signedMessage: acceptance.signedMessage,
    acknowledgementText: sa.acknowledgementText,
  }

  const zip = new JSZip()
  zip.file("Wildcat ToU Acceptance Record.txt", buildRecordFile(acceptance))
  zip.file("Accepted Terms of Use.txt", sa.plaintext)
  zip.file("acceptance-record.json", JSON.stringify(record, null, 2))
  zip.file("README.txt", README)
  const zipBlob = await zip.generateAsync({ type: "blob" })

  return new NextResponse(zipBlob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="Wildcat ToU Acceptance -${address}.zip"`,
    },
  })
}

export const dynamic = "force-dynamic"
