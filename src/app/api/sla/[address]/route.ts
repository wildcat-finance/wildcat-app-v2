import { NextRequest, NextResponse } from "next/server"

export async function getSignedServiceAgreement(address: `0x${string}`) {
  let signed: boolean

  try {
    const { data: isSigned } = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/sla/${address.toLowerCase()}`,
    ).then((res) => res.json())

    signed = Boolean(isSigned)
  } catch {
    signed = false
  }

  return signed
}

export async function GET(
  request: NextRequest,
  { params }: { params: { address: `0x${string}` } },
) {
  const { address } = params
  const isSigned = await getSignedServiceAgreement(address)

  return NextResponse.json({ isSigned })
}
