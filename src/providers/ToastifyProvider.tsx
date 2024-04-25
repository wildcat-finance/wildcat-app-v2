"use client"

import React from "react"

import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

import { GenericProviderProps } from "./interface"

export const ToastifyProvider = ({ children }: GenericProviderProps) => (
  <>
    {children}
    <ToastContainer />
  </>
)
