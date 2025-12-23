export async function POST(req: Request) {
  const raw = await req.text()

  console.log("===== CSP REPORT START =====")
  console.log(raw)
  console.log("===== CSP REPORT END =====")

  return new Response(null, { status: 204 })
}

export async function GET() {
  return new Response("CSP report endpoint is alive", { status: 200 })
}
