import { Box, Button, Typography } from "@mui/material"

export const WrapperLookupError = ({ onRetry }: { onRetry: () => void }) => (
  <Box role="alert">
    <Typography variant="text3">Unable to load wrapper details.</Typography>
    <Button onClick={onRetry}>Try again</Button>
  </Box>
)
