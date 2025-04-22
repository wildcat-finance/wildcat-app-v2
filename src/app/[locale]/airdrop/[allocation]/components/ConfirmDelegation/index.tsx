import { Box, Button, Typography } from "@mui/material"

import { COLORS } from "@/theme/colors"

import { AllocationAccount } from "../AllocationAccount"

export const ConfirmDelegation = ({
  setProgress,
}: {
  setProgress: (progress: number) => void
}) => {
  const a = 0
  return (
    <Box display="flex" flexDirection="column" height="100%" gap="24px">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap="16px"
        height="100%"
        maxWidth="400px"
        margin="auto"
      >
        <Typography>You delegate 15,000 WETH to</Typography>
        <Box
          sx={{
            p: "4px 12px",
            borderRadius: "8px",
            backgroundColor: COLORS.whiteSmoke,
          }}
        >
          <AllocationAccount handleSelect={() => setProgress(70)} />
        </Box>
      </Box>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Button variant="contained" color="primary">
          Sign
        </Button>
        <Button variant="contained" color="primary">
          Sign
        </Button>
      </Box>
    </Box>
  )
}
