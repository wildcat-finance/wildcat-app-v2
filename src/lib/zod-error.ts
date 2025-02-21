import { NextResponse } from "next/server"
import { z } from "zod"

export const getZodParseError = (error: unknown) => {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ errors: error.issues }, { status: 400 })
  }
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : "Error validating input",
    },
    { status: 400 },
  )
}
