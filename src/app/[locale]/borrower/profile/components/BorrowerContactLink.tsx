"use client"

import React from "react"

import { Box } from "@mui/material"
import classNames from "classnames"

export const BorrowerContactLink = ({
  icon,
  link,
  text,
  name,
}: {
  icon: JSX.Element
  link: string
  text: string
  name: string
}) => {
  const linkClasses = classNames(
    "hover:underline",
    "text-sm",
    "flex",
    "flex-row",
    "items-center",
    "gap-3",
    "text-blue-500",
    "hover:text-blue-600",
    "visited:text-purple-600",
    "visited:hover:text-purple-700",
  )
  return (
    <Box
      display="flex"
      flexDirection="row"
      alignItems="center"
      gap={1}
      width="100%"
    >
      <Box
        display="flex"
        flexDirection="row"
        alignItems="center"
        gap={1}
        className="w-1/6"
      >
        {icon}
        {name}:
      </Box>

      <a className={linkClasses} href={link} target="_blank" rel="noreferrer">
        {text}
      </a>
    </Box>
  )
}
