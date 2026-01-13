import * as React from "react"

import { Box, Divider, Skeleton, Typography } from "@mui/material"
import { SxProps, Theme } from "@mui/system"

import {
  MarketParametersColumn,
  MarketParametersContainer,
  MarketParametersRowsDivider,
} from "@/app/[locale]/borrower/profile/style"
import { COLORS } from "@/theme/colors"

export const ProfileSkeleton = ({
  type,
  hideMarkets,
  rootSx,
}: {
  type: "user" | "external"
  hideMarkets?: boolean
  rootSx?: SxProps<Theme>
}) => (
  <Box sx={rootSx}>
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: type === "user" ? "flex-start" : "center",
      }}
    >
      <Skeleton
        height="48px"
        width="48px"
        sx={{
          bgcolor: COLORS.athensGrey,
          borderRadius: "50%",
          marginBottom: "24px",
        }}
      />

      <Skeleton
        height="40px"
        width="300px"
        sx={{ bgcolor: COLORS.athensGrey, marginBottom: "12px" }}
      />

      <Skeleton
        height="40px"
        width="500px"
        sx={{ bgcolor: COLORS.athensGrey, marginBottom: "22px" }}
      />

      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: type === "user" ? "space-between" : "center",
        }}
      >
        <Box display="flex" gap="6px">
          <Skeleton
            height="28px"
            width="70px"
            sx={{ bgcolor: COLORS.athensGrey, borderRadius: "8px" }}
          />

          <Skeleton
            height="28px"
            width="70px"
            sx={{ bgcolor: COLORS.athensGrey, borderRadius: "8px" }}
          />

          <Skeleton
            height="28px"
            width="70px"
            sx={{ bgcolor: COLORS.athensGrey, borderRadius: "8px" }}
          />
        </Box>

        {type === "user" && (
          <Skeleton
            height="28px"
            width="102px"
            sx={{ bgcolor: COLORS.athensGrey, borderRadius: "8px" }}
          />
        )}
      </Box>
    </Box>

    <Divider sx={{ margin: "32px 0" }} />

    {!hideMarkets && (
      <Box marginBottom="44px">
        <Typography variant="title3">Active Markets</Typography>
        <Box
          marginTop="30px"
          display="flex"
          flexDirection="column"
          rowGap="8px"
        >
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
          <Skeleton
            height="52px"
            width="100%"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
        </Box>
      </Box>
    )}

    <Box>
      <Typography variant="title3">Overall Info</Typography>

      <Box sx={MarketParametersContainer}>
        <Box sx={MarketParametersColumn}>
          <Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Skeleton
                height="20px"
                width="85px"
                sx={{ bgcolor: COLORS.athensGrey }}
              />

              <Skeleton
                height="20px"
                width="85px"
                sx={{ bgcolor: COLORS.athensGrey }}
              />
            </Box>
            <Divider sx={MarketParametersRowsDivider} />
          </Box>

          <Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Skeleton
                height="20px"
                width="85px"
                sx={{ bgcolor: COLORS.athensGrey }}
              />

              <Skeleton
                height="20px"
                width="85px"
                sx={{ bgcolor: COLORS.athensGrey }}
              />
            </Box>
            <Divider sx={MarketParametersRowsDivider} />
          </Box>

          <Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Skeleton
                height="20px"
                width="85px"
                sx={{ bgcolor: COLORS.athensGrey }}
              />

              <Skeleton
                height="20px"
                width="85px"
                sx={{ bgcolor: COLORS.athensGrey }}
              />
            </Box>
            <Divider sx={MarketParametersRowsDivider} />
          </Box>
        </Box>

        <Box sx={MarketParametersColumn}>
          <Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Skeleton
                height="20px"
                width="85px"
                sx={{ bgcolor: COLORS.athensGrey }}
              />

              <Skeleton
                height="20px"
                width="85px"
                sx={{ bgcolor: COLORS.athensGrey }}
              />
            </Box>
            <Divider sx={MarketParametersRowsDivider} />
          </Box>

          <Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Skeleton
                height="20px"
                width="85px"
                sx={{ bgcolor: COLORS.athensGrey }}
              />

              <Skeleton
                height="20px"
                width="85px"
                sx={{ bgcolor: COLORS.athensGrey }}
              />
            </Box>
            <Divider sx={MarketParametersRowsDivider} />
          </Box>

          <Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Skeleton
                height="20px"
                width="85px"
                sx={{ bgcolor: COLORS.athensGrey }}
              />

              <Skeleton
                height="20px"
                width="85px"
                sx={{ bgcolor: COLORS.athensGrey }}
              />
            </Box>
            <Divider sx={MarketParametersRowsDivider} />
          </Box>
        </Box>
      </Box>
    </Box>
  </Box>
)
