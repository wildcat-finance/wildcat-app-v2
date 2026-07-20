import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

/**
 * Strapi publish webhook -> on-demand i18n cache invalidation.
 *
 * Strapi calls this endpoint on entry.publish / entry.unpublish with a shared
 * secret in the Authorization header. We bust the "i18n" cache tag so the next
 * request re-fetches fresh translations from Strapi — no redeploy needed.
 *
 * NOTE: Next.js 14 `revalidateTag` takes a single argument. (The two-argument
 * form shown on current nextjs.org docs is Next 16 only.)
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("authorization")

  if (secret !== `Bearer ${process.env.REVALIDATE_SECRET}`) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 })
  }

  revalidateTag("i18n")

  return NextResponse.json({ revalidated: true })
}
