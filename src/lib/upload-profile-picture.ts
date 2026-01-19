import { createClient } from "@supabase/supabase-js"
import { decode } from "base64-arraybuffer"

import { logger } from "@/lib/logging/server"

export async function uploadProfilePicture(
  base64Image: string,
  address: string,
): Promise<string | undefined> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Convert base64 to Buffer
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "")
  const buffer = decode(base64Data)
  /* Buffer.from(base64Data, "base64") */

  // Extract file extension from base64 mime type
  const mimeType = base64Image.match(/^data:image\/(\w+);base64,/)?.[1] || "png"
  const fileName = `${address}-${Date.now()}.${mimeType}`

  const { data, error } = await supabase.storage
    .from("profile-pictures")
    .upload(fileName, buffer, {
      upsert: true,
      contentType: `image/${mimeType}`,
    })

  if (error) {
    logger.error({ err: error, address }, "Error uploading profile picture")
    return undefined
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("profile-pictures").getPublicUrl(fileName)

  return publicUrl
}
