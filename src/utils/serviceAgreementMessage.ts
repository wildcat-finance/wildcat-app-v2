import { formatUnixMsAsDate } from "@/utils/formatters"

export const buildServiceAgreementMessage = ({
  acknowledgementText,
  timeSigned,
  organizationName,
}: {
  acknowledgementText: string
  timeSigned: number
  organizationName?: string
}): string => {
  let message = `${acknowledgementText}\n\nDate: ${formatUnixMsAsDate(
    timeSigned,
  )}`
  if (organizationName) {
    message = `${message}\n\nOrganization Name: ${organizationName}`
  }
  return message
}
