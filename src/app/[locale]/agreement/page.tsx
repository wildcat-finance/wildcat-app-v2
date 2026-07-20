import { redirect } from "next/navigation"

import { ROUTES } from "@/routes"

export default function Agreement() {
  redirect(ROUTES.lender.agreement)
}
