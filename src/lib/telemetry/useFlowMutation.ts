"use client"

import { useCallback, useRef } from "react"

import { Context } from "@opentelemetry/api"

import {
  createClientFlowSession,
  type ClientFlowRef,
} from "@/lib/telemetry/clientFlow"
import { TelemetryAttrs } from "@/lib/telemetry/types"

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  return String(error)
}

export const useFlowMutation = () => {
  const sessionRef = useRef(createClientFlowSession())

  const start = useCallback((flowName: string, attrs?: TelemetryAttrs) => {
    sessionRef.current.startFlowSpan(flowName, attrs)
  }, [])

  const getParentContext = useCallback(
    (): Context | null => sessionRef.current.getParentContext(),
    [],
  )

  const endSuccess = useCallback((attrs?: TelemetryAttrs) => {
    sessionRef.current.endFlowSpan("success", attrs)
  }, [])

  const endError = useCallback((error: unknown, attrs?: TelemetryAttrs) => {
    sessionRef.current.endFlowSpan("error", {
      ...attrs,
      "error.message": toErrorMessage(error),
    })
  }, [])

  const endCancel = useCallback((attrs?: TelemetryAttrs) => {
    sessionRef.current.endFlowSpan("cancelled", attrs)
  }, [])

  const reset = useCallback(() => {
    // Cancel any unclosed flow session so the next action starts cleanly.
    sessionRef.current.endFlowSpan("cancelled")
  }, [])

  const getFlowRef = useCallback(
    (): ClientFlowRef => sessionRef.current.getFlowRef(),
    [],
  )

  return {
    start,
    getParentContext,
    endSuccess,
    endError,
    endCancel,
    reset,
    getFlowRef,
  }
}
