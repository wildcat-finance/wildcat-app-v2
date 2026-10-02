import * as React from "react"

import { Box, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useMobileResolution } from "@/hooks/useMobileResolution"
import type { Destination } from "@/lib/destinations/types"
import { COLORS } from "@/theme/colors"

import { DestinationCard } from "./DestinationCard"
import { ExternalLinkGate, type ExternalLinkTarget } from "./ExternalLinkGate"

export const DestinationsList = ({
  destinations,
  stale,
  columns = 1,
}: {
  destinations: Destination[]
  stale: boolean
  columns?: 1 | 2
}) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()
  const [target, setTarget] = React.useState<ExternalLinkTarget | null>(null)

  const textVariant = isMobile ? "mobText4" : "text4"

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {stale && (
        <Typography variant={textVariant} color={COLORS.amberText}>
          {t("destinations.panel.stale")}
        </Typography>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns:
            columns === 2 && !isMobile ? "repeat(2, minmax(0, 1fr))" : "1fr",
          gap: "8px",
        }}
      >
        {destinations.map((destination) => (
          <DestinationCard
            key={destination.id}
            destination={destination}
            onOpen={({ url, urlHost }) => setTarget({ url, host: urlHost })}
          />
        ))}
      </Box>

      <Typography variant={textVariant} color={COLORS.santasGrey}>
        {t("destinations.panel.footer")}
      </Typography>

      <ExternalLinkGate target={target} onClose={() => setTarget(null)} />
    </Box>
  )
}
