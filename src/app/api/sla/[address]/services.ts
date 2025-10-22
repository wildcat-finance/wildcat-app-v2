export async function getSignedServiceAgreement(
  address: `0x${string}`,
  chainId: number,
) {
  let signed: boolean

  try {
    const { data: isSigned } = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL
      }/sla/${address.toLowerCase()}?chainId=${chainId}`,
      { cache: "no-cache" },
    ).then((res) => res.json())

    signed = Boolean(isSigned)
  } catch {
    signed = false
  }

  return signed
}
