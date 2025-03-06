import { dayjs } from "@/utils/dayjs"

export const API_URL = process.env.NEXT_PUBLIC_API_URL as string | undefined

export const getLoginSignatureMessage = (address: string, timeSigned: number) =>
  `Connect to wildcat.finance as account ${address.toLowerCase()}\nDate: ${dayjs(
    timeSigned * 1000,
  )
    .utc()
    .format("MMMM DD, YYYY")}`
