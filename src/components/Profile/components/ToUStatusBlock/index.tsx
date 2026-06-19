import * as React from "react"

import { Box, Button, Divider, Skeleton, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { ServiceAgreementStatusResponse } from "@/app/api/service-agreement/interface"
import { ParametersItem } from "@/components/ParametersItem"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { dayjs } from "@/utils/dayjs"
import { formatServiceAgreementVersionLabel } from "@/utils/serviceAgreementVersions"

import { InfoDivider, MobileInfoDivider } from "../OverallBlock/style"

export type ToUStatusBlockProps = {
  address: string | undefined
  status: ServiceAgreementStatusResponse | undefined
  isLoading: boolean
  externalChainId?: number
  isPage?: boolean
}

export const ToUStatusBlock = ({
  address,
  status,
  isLoading,
  externalChainId,
  isPage,
}: ToUStatusBlockProps) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()
  const { chainId: selectedChainId } = useSelectedNetwork()
  const chainId = externalChainId ?? selectedChainId

  const getTitleVariant = () => {
    if (isMobile) return "mobH3"
    if (isPage) return "title3"
    return "text2Highlighted"
  }

  if (isLoading) {
    return (
      <Box>
        <Typography variant={getTitleVariant()}>
          {t("borrowerProfile.profile.touStatus.title")}
        </Typography>
        <Box sx={{ marginTop: isPage ? "24px" : "16px" }}>
          {[0, 1, 2].map((row) => (
            <Box key={row}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                }}
              >
                <Skeleton variant="text" width={140} />
                <Skeleton variant="text" width={110} />
              </Box>
              {row < 2 && (
                <Divider sx={isMobile ? MobileInfoDivider : InfoDivider} />
              )}
            </Box>
          ))}
        </Box>
      </Box>
    )
  }

  if (!status) return null

  const { current, accepted } = status

  const items: { title: string; value: string; valueTitle?: string }[] = [
    {
      title: t("borrowerProfile.profile.touStatus.acceptedVersion"),
      value: accepted
        ? formatServiceAgreementVersionLabel(accepted.version)
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
      value: formatServiceAgreementVersionLabel(current.version),
      valueTitle: current.version,
    },
  ]

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
