import { ROUTES } from "@/routes"

export const isBorrowerAppPath = (pathname: string) =>
  pathname === ROUTES.borrower.root ||
  pathname.startsWith(`${ROUTES.borrower.root}/`)

export const isBorrowerContextPath = (pathname: string, _address?: string) =>
  isBorrowerAppPath(pathname)
