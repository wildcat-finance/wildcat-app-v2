import * as React from "react"

import { Box, Button, Divider, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useGetServiceAgreementStatus } from "@/app/[locale]/borrower/profile/hooks/useGetServiceAgreementStatus"
import { ParametersItem } from "@/components/ParametersItem"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { dayjs } from "@/utils/dayjs"

import { InfoDivider, MobileInfoDivider } from "../OverallBlock/style"

export type ToUStatusBlockProps = {
  address: string | undefined
  externalChainId?: number
  isPage?: boolean
}

// Display-only labels for the DB version strings; the raw string is shown on hover.
// Unknown versions (e.g. a future publish) fall back to the raw string.
const VERSION_LABELS: Record<string, string> = {
  "legacy-service-agreement-2023-12-18": "Legacy",
  "terms-of-use-2025-01-17-prelive-1028": "Pre-live",
  "terms-of-use-v1-2025-01-17": "Version 1",
  "terms-of-use-v2-2025-02-12": "Version 2",
}

const prettyVersion = (version: string): string =>
  VERSION_LABELS[version] ?? version

export const ToUStatusBlock = ({
  address,
  externalChainId,
  isPage,
}: ToUStatusBlockProps) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()
  const { chainId: selectedChainId } = useSelectedNetwork()
  const chainId = externalChainId ?? selectedChainId
  const { data } = useGetServiceAgreementStatus(address, externalChainId)

  if (!data) return null

  const { current, accepted } = data

  const items: { title: string; value: string; valueTitle?: string }[] = [
    {
      title: t("borrowerProfile.profile.touStatus.acceptedVersion"),
      value: accepted
        ? prettyVersion(accepted.version)
        : t("borrowerProfile.profile.touStatus.notAccepted"),
      valueTitle: accepted?.version,
    },
    ...(accepted
      ? [
          {
            title: t("borrowerProfile.profile.touStatus.acceptedOn"),
            value: dayjs(accepted.acceptedAt).utc().format("DD-MMM-YYYY HH:mm"),
          },
        ]
      : []),
    {
      title: t("borrowerProfile.profile.touStatus.currentVersion"),
      value: prettyVersion(current.version),
      valueTitle: current.version,
    },
  ]

  const getTitleVariant = () => {
    if (isMobile) return "mobH3"
    if (isPage) return "title3"
    return "text2Highlighted"
  }

  const handleDownload = () => {
    if (!address) return
    window.open(
      `/api/service-agreement/${address.toLowerCase()}/certificate?chainId=${chainId}`,
      "_blank",
    )
  }

  return (
    <Box>
      <Typography variant={getTitleVariant()}>
        {t("borrowerProfile.profile.touStatus.title")}
      </Typography>

      <Box sx={{ marginTop: isPage ? "24px" : "16px" }}>
        {items.map((item, index) => (
          <Box key={item.title}>
            <ParametersItem
              title={item.title}
              value={item.value}
              valueTitle={item.valueTitle}
            />
            {index < items.length - 1 && (
              <Divider sx={isMobile ? MobileInfoDivider : InfoDivider} />
            )}
          </Box>
        ))}
      </Box>

      {accepted && (
        <Button
          variant="contained"
          color="secondary"
          size="small"
          onClick={handleDownload}
          sx={{ marginTop: "16px" }}
        >
          {t("borrowerProfile.profile.touStatus.download")}
        </Button>
      )}
    </Box>
  )
}
