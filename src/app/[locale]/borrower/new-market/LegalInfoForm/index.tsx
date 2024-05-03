import { Box, Button, MenuItem, TextField, Typography } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import Link from "next/link"

import { ConfirmationModal } from "@/app/[locale]/borrower/new-market/ConfirmationModal"
import BackArrow from "@/assets/icons/arrowLeft_icon.svg"
import { ExtendedSelect } from "@/components/@extended/ExtendedSelect"
import { InputLabel } from "@/components/InputLabel"
import { ROUTES } from "@/routes"

import {
  BackButton,
  BackButtonArrow,
  ButtonsContainer,
  Description,
  DropdownOption,
  InputGroupContainer,
  TitleContainer,
} from "./style"

export const LegalInfoForm = () => (
  <Box>
    <Box sx={TitleContainer}>
      <Typography variant="title2">Share your legal info with us</Typography>
      <Typography variant="text2" sx={Description}>
        It’s necessary for creating markets with MLA
      </Typography>
    </Box>

    <InputLabel label="Full legal name" margin="16px 0 0 0">
      <TextField label="Use more than 1 character" />
    </InputLabel>

    <Box sx={InputGroupContainer}>
      <InputLabel label="Jurisdiction">
        <ExtendedSelect label="Please Select">
          <MenuItem value="noMLA" sx={DropdownOption}>
            UK
          </MenuItem>
        </ExtendedSelect>
      </InputLabel>

      <InputLabel label="Legal Nature">
        <ExtendedSelect label="Please Select">
          <MenuItem value="share" sx={DropdownOption}>
            LLC
          </MenuItem>
        </ExtendedSelect>
      </InputLabel>

      <InputLabel label="Address">
        <TextField label="Enter a location" />
      </InputLabel>

      <InputLabel label="Email">
        <TextField label="example@domain.com" />
      </InputLabel>
    </Box>

    <Box sx={ButtonsContainer}>
      <Link href={ROUTES.borrower.root} passHref>
        <Button size="large" variant="text" sx={BackButton}>
          <SvgIcon fontSize="medium" sx={BackButtonArrow}>
            <BackArrow />
          </SvgIcon>
          Back
        </Button>
      </Link>

      <ConfirmationModal />
    </Box>
  </Box>
)
