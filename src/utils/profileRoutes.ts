import { ROUTES } from "@/routes"

export const isBorrowerAppPath = (pathname: string) =>
  pathname === ROUTES.borrower.root ||
  pathname.startsWith(`${ROUTES.borrower.root}/`)

export const getPublicBorrowerProfileAddress = (pathname: string) => {
  const marker = `${ROUTES.profile.borrower}/`
  const markerIndex = pathname.indexOf(marker)

  if (markerIndex === -1) return undefined

  const address = pathname.slice(markerIndex + marker.length).split("/")[0]
  return address || undefined
}

export const isOwnBorrowerProfilePath = (
  pathname: string,
  address: string | undefined,
) => {
  const profileAddress = getPublicBorrowerProfileAddress(pathname)

  return (
    !!address &&
    !!profileAddress &&
    profileAddress.toLowerCase() === address.toLowerCase()
  )
}

export const isBorrowerContextPath = (pathname: string, address?: string) =>
  isBorrowerAppPath(pathname) || isOwnBorrowerProfilePath(pathname, address)
