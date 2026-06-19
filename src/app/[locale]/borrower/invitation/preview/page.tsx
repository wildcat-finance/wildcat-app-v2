import { notFound } from "next/navigation"

import { BorrowerInvitationPreview } from "./BorrowerInvitationPreview"

export default function BorrowerInvitationPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound()

  return <BorrowerInvitationPreview />
}
