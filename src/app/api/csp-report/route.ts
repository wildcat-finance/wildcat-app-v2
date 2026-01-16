const isPreview = process.env.VERCEL_ENV === "preview"

export async function POST(req: Request) {
  const text = await req.text()

  try {
    const data = JSON.parse(text)
    if (isPreview) {
      console.log("CSP report:", data)
    } else {
      console.log("A CSP violation was detected.")
    }
  } catch {
    // ignore invalid JSON
  }

  return new Response(null, { status: 204 })
}

export async function OPTIONS() {
  return new Response(null, { status: 204 })
}
