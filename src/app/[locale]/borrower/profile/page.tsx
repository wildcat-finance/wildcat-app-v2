"use client"

import React, { useState } from "react"

import { Box, TextField, Typography } from "@mui/material"

import HiExternalLink from "@/assets/icons/hi_external_link.svg"
import HiOutlineMail from "@/assets/icons/hi_outline_mail.svg"
import TelegramIcon from "@/assets/icons/telegram_icon.svg"
import TwitterIcon from "@/assets/icons/twitter_icon.svg"
import { InputLabel } from "@/components/InputLabel"

import { BorrowerContactInput } from "./components/BorrowerContactInput"
import { ForwardRefEditor } from "./components/Editor"
import { ContentContainer, InputGroupContainer } from "./style"

function BorrowerData() {
  const [description, setDescription] = useState("")
  const [twitter, setTwitter] = useState("")
  const [telegram, setTelegram] = useState("")
  const [website, setWebsite] = useState("")
  const [email, setEmail] = useState("")
  return (
    <Box maxWidth="766px" width="100%">
      <Box marginBottom="20px">
        <Typography variant="title2">Borrower Profile</Typography>
      </Box>

      <Box sx={InputGroupContainer}>
        <InputLabel
          label="Name"
          subtitle="The name lenders will see when they view your markets"
        >
          <TextField size="medium" placeholder="Bob the Honest Borrower" />
        </InputLabel>
      </Box>

      <Box
        marginTop="16px"
        sx={{
          width: "100%",
          backgroundColor: "whitesmoke",
        }}
      >
        <ForwardRefEditor
          className="my-mdx-editor"
          markdown={description}
          onChange={setDescription}
        />
      </Box>

      <Box
        style={{ width: "100%" }}
        marginTop="40px"
        display="flex"
        flexDirection="column"
      >
        <Typography variant="title3">Contact Details</Typography>
        <Typography variant="text3">
          Remember that these details will be public
        </Typography>
      </Box>
      <Box style={{ width: "100%" }} marginTop="16px">
        <BorrowerContactInput
          icon={<TelegramIcon width="1em" height="auto" />}
          text={telegram}
          onChange={setTelegram}
          name="Telegram"
          placeholder="borrowbob1"
        />
      </Box>

      <Box style={{ width: "100%" }} marginTop="16px">
        <BorrowerContactInput
          icon={<TwitterIcon color="black" width="1em" height="auto" />}
          text={twitter}
          name="Twitter"
          onChange={setTwitter}
          placeholder="@borrowbob"
        />
      </Box>

      <Box style={{ width: "100%" }} marginTop="16px">
        <BorrowerContactInput
          icon={<HiOutlineMail color="#1d9bf0" width="1em" height="auto" />}
          text={email}
          onChange={setEmail}
          name="Email"
          placeholder="bob@alameda-research.com"
        />
      </Box>

      <Box style={{ width: "100%" }} marginTop="16px">
        <BorrowerContactInput
          icon={<HiExternalLink color="#1d9bf0" width="1em" height="auto" />}
          text={website}
          onChange={setWebsite}
          name="Website"
          placeholder="reliablebob.com"
        />
      </Box>
    </Box>
  )
}

export default function BorrowerProfile() {
  return (
    <Box sx={ContentContainer}>
      <BorrowerData />
    </Box>
  )
}
