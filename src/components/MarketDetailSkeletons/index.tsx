import { Box, Divider, Skeleton } from "@mui/material"

import { COLORS } from "@/theme/colors"

const skeletonStyle = {
  bgcolor: COLORS.athensGrey,
  borderRadius: "12px",
}

const sectionWidth = {
  width: "100%",
  maxWidth: "807px",
}

export const TransactionCardsSkeleton = () => (
  <Box
    sx={{
      ...sectionWidth,
      display: "flex",
      justifyContent: "space-between",
      gap: "17px",
    }}
  >
    <Skeleton height="82px" width="395px" sx={skeletonStyle} />
    <Skeleton height="82px" width="395px" sx={skeletonStyle} />
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

export const BorrowerTransactionsSkeleton = () => (
  <Box sx={{ minHeight: "178px" }}>
    <ActionsRowSkeleton />
    <Divider sx={{ margin: "32px 0" }} />
    <TransactionCardsSkeleton />
  </Box>
)

export const LenderTransactionsSkeleton = () => (
  <Box sx={{ minHeight: "366px" }}>
    <ActionsRowSkeleton />
    <Divider sx={{ margin: "32px 0" }} />
    <TransactionCardsSkeleton />
    <Divider sx={{ margin: "32px 0 40px" }} />
    <Box sx={{ ...sectionWidth, display: "flex", flexDirection: "column" }}>
      <Skeleton height="28px" width="62%" sx={skeletonStyle} />
      <Skeleton
        height="20px"
        width="46%"
        sx={{ ...skeletonStyle, mt: "8px" }}
      />
    </Box>
    <Divider sx={{ margin: "40px 0 32px" }} />
  </Box>
)

export const ChartSectionSkeleton = ({
  sections = 1,
}: {
  sections?: number
}) => (
  <Box
    sx={{
      ...sectionWidth,
      display: "flex",
      flexDirection: "column",
      gap: "28px",
      minHeight: sections * 128,
    }}
  >
    {Array.from({ length: sections }).map((_, index) => (
      <Box
        // eslint-disable-next-line react/no-array-index-key
        key={index}
        sx={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Skeleton height="28px" width="180px" sx={skeletonStyle} />
          <Skeleton height="28px" width="120px" sx={skeletonStyle} />
        </Box>
        <Skeleton height="24px" width="100%" sx={skeletonStyle} />
        <Box sx={{ display: "flex", gap: "28px" }}>
          <Skeleton height="24px" width="31%" sx={skeletonStyle} />
          <Skeleton height="24px" width="31%" sx={skeletonStyle} />
          <Skeleton height="24px" width="31%" sx={skeletonStyle} />
        </Box>
      </Box>
    ))}
  </Box>
)

export const DescriptionSkeleton = ({
  withHeader = false,
}: {
  withHeader?: boolean
}) => (
  <Box sx={{ ...sectionWidth, minHeight: withHeader ? "180px" : "132px" }}>
    {withHeader && (
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: "16px",
        }}
      >
        <Skeleton height="28px" width="180px" sx={skeletonStyle} />
        <Skeleton height="28px" width="72px" sx={skeletonStyle} />
      </Box>
    )}
    <Box
      sx={{
        padding: "20px",
        borderRadius: "14px",
        border: `1px solid ${COLORS.athensGrey}`,
      }}
    >
      <Skeleton height="22px" width="92%" sx={skeletonStyle} />
      <Skeleton
        height="22px"
        width="86%"
        sx={{ ...skeletonStyle, mt: "10px" }}
      />
      <Skeleton
        height="22px"
        width="64%"
        sx={{ ...skeletonStyle, mt: "10px" }}
      />
    </Box>
  </Box>
)
