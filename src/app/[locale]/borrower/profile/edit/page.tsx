"use client"

import { Box, Button, Typography } from "@mui/material"
import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"

import { EditPageContainer } from "@/app/[locale]/borrower/profile/edit/style"
import { useBorrowerRestriction } from "@/hooks/useBorrowerRestriction"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

import EditProfileForm from "./components/EditProfileForm"

export default function EditProfile() {
  const router = useRouter()
  const { address } = useAccount()
  const afterSubmit = () => {
    router.push(ROUTES.borrower.profile)
  }

  const handleCancel = () => {
    router.push(ROUTES.borrower.profile)
  }
  const { restricted } = useBorrowerRestriction()
  // Removed or manually restricted borrowers cannot edit profile data;
  // the API rejects it server-side as well. (product#789)
  if (restricted) {
    return (
      <Box
        sx={{
          ...EditPageContainer,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
        }}
      >
        <Typography variant="title2" fontWeight={600} textAlign="center">
          Profile editing is restricted
        </Typography>
        <Typography
          variant="text2"
          color={COLORS.santasGrey}
          textAlign="center"
          sx={{ maxWidth: "440px" }}
        >
          This account is restricted from editing its borrower profile. Contact
          the Wildcat team if you believe this is an error.
        </Typography>
        <Button variant="contained" size="large" onClick={handleCancel}>
          Back to profile
        </Button>
      </Box>
    )
  }
  return (
    <EditProfileForm
      sx={EditPageContainer}
      address={address as `0x${string}`}
      onCancel={handleCancel}
      afterSubmit={afterSubmit}
    />
  )
}
