import { Box, Divider, Skeleton } from "@mui/material"

import {
  MarketHeaderDetailsRow,
  MarketHeaderInfoContainer,
  MarketHeaderStatusRow,
  MarketHeaderTitleRow,
  MarketHeaderUpperContainer,
} from "@/components/MarketHeader/style"
import { COLORS } from "@/theme/colors"

const skeletonStyle = {
  bgcolor: COLORS.athensGrey,
  borderRadius: "12px",
}

const sectionWidth = {
  width: "100%",
  maxWidth: "807px",
}

const LENDER_CHARTS = ["capacity", "debt", "withdrawals"]
const LEGEND_CARDS = ["first", "second", "third"]

export const MarketHeaderSkeleton = () => (
  <Box sx={MarketHeaderUpperContainer}>
    <Box sx={MarketHeaderInfoContainer}>
      <Box sx={MarketHeaderTitleRow}>
        <Skeleton
          height="32px"
          width="320px"
          sx={{ ...skeletonStyle, flex: "0 1 320px", minWidth: 0 }}
        />
        <Box sx={MarketHeaderStatusRow}>
          <Skeleton
            variant="rounded"
            width={190}
            height={16}
            aria-label="Loading market status"
          />
        </Box>
      </Box>

      <Box sx={MarketHeaderDetailsRow}>
        <Skeleton height="24px" width="120px" sx={skeletonStyle} />
        <Box sx={{ display: "flex", alignItems: "center", padding: "2px 8px" }}>
          <Skeleton height="22px" width="220px" sx={skeletonStyle} />
        </Box>
      </Box>
    </Box>
  </Box>
)

export const StandaloneActionsSkeleton = () => (
  <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
    <Skeleton
      height="28px"
      width="118px"
      sx={{ ...skeletonStyle, borderRadius: "8px" }}
    />
    <Skeleton
      height="28px"
      width="175px"
      sx={{ ...skeletonStyle, borderRadius: "8px" }}
    />
  </Box>
)

export const ActionsRowSkeleton = () => (
  <Box
    sx={{
      ...sectionWidth,
      height: "28px",
      display: "flex",
      columnGap: "6px",
      overflow: "hidden",
    }}
  >
    <Skeleton height="28px" width="110px" sx={skeletonStyle} />
    <Skeleton height="28px" width="120px" sx={skeletonStyle} />
    <Skeleton height="28px" width="142px" sx={skeletonStyle} />
  </Box>
)

export const TransactionCardsSkeleton = () => (
  <Box
    sx={{
      width: "100%",
      maxWidth: "940px",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: "20px",
    }}
  >
    <Skeleton
      height="153px"
      width="100%"
      sx={{ ...skeletonStyle, borderRadius: "20px" }}
    />
    <Skeleton
      height="153px"
      width="100%"
      sx={{ ...skeletonStyle, borderRadius: "20px" }}
    />
  </Box>
)

const BarChartSkeleton = ({ legendCards }: { legendCards?: number }) => (
  <Box sx={{ marginTop: "12px" }}>
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Skeleton height="32px" width="180px" sx={skeletonStyle} />
      <Skeleton height="32px" width="120px" sx={skeletonStyle} />
    </Box>
    <Skeleton
      height="24px"
      width="100%"
      sx={{ ...skeletonStyle, mt: "24px" }}
    />
    {legendCards ? (
      <Box sx={{ display: "flex", gap: "16px", mt: "24px" }}>
        {LEGEND_CARDS.slice(0, legendCards).map((key) => (
          <Skeleton
            key={key}
            height="90px"
            width="100%"
            sx={{ ...skeletonStyle, borderRadius: "8px" }}
          />
        ))}
      </Box>
    ) : (
      <Box sx={{ display: "flex", gap: "28px", mt: "16px" }}>
        {LEGEND_CARDS.map((key) => (
          <Skeleton key={key} height="16px" width="140px" sx={skeletonStyle} />
        ))}
      </Box>
    )}
  </Box>
)

export const ChartSectionSkeleton = ({ isLender }: { isLender: boolean }) => (
  <Box>
    {isLender ? (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {LENDER_CHARTS.map((key) => (
          <BarChartSkeleton key={key} />
        ))}
      </Box>
    ) : (
      <BarChartSkeleton legendCards={2} />
    )}
    <Divider sx={{ margin: "40px 0 44px" }} />
  </Box>
)

export const LenderTransactionsSkeleton = () => (
  <Box>
    <ActionsRowSkeleton />
    <Divider sx={{ margin: "32px 0" }} />
    <TransactionCardsSkeleton />
    <Divider sx={{ margin: "32px 0 40px" }} />
    <Box sx={{ ...sectionWidth, display: "flex", flexDirection: "column" }}>
      <Skeleton height="32px" width="62%" sx={skeletonStyle} />
      <Skeleton
        height="20px"
        width="46%"
        sx={{ ...skeletonStyle, mt: "8px" }}
      />
    </Box>
    <Divider sx={{ margin: "40px 0 32px" }} />
    <BarChartSkeleton legendCards={3} />
  </Box>
)

export const AccountRowsSkeleton = () => (
  <Box
    sx={{
      ...sectionWidth,
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      minHeight: "148px",
    }}
  >
    <Skeleton height="36px" width="100%" sx={skeletonStyle} />
    <Skeleton height="36px" width="100%" sx={skeletonStyle} />
    <Skeleton height="36px" width="100%" sx={skeletonStyle} />
  </Box>
)

export const MarketRecordsSkeleton = ({
  isMobile = false,
}: {
  isMobile?: boolean
}) => (
  <Box
    display="flex"
    flexDirection="column"
    padding={isMobile ? "8px 0" : "32px 16px"}
    rowGap="8px"
  >
    <Skeleton
      height={isMobile ? "60px" : "52px"}
      width="100%"
      sx={{ bgcolor: COLORS.athensGrey }}
    />
    <Skeleton
      height={isMobile ? "60px" : "52px"}
      width="100%"
      sx={{ bgcolor: COLORS.athensGrey }}
    />
    <Skeleton
      height={isMobile ? "60px" : "52px"}
      width="100%"
      sx={{ bgcolor: COLORS.athensGrey }}
    />
  </Box>
)

export const DescriptionSkeleton = () => (
  <Box
    sx={{
      width: "100%",
      padding: "20px",
      borderRadius: "14px",
      border: `1px solid ${COLORS.athensGrey}`,
    }}
  >
    <Skeleton height="22px" width="92%" sx={skeletonStyle} />
    <Skeleton height="22px" width="86%" sx={{ ...skeletonStyle, mt: "10px" }} />
    <Skeleton height="22px" width="64%" sx={{ ...skeletonStyle, mt: "10px" }} />
  </Box>
)
