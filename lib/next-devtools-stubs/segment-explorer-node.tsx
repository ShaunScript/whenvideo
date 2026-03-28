"use client"

import * as React from "react"

export type SegmentBoundaryType = "not-found" | "error" | "loading" | "global-error"

export const SEGMENT_EXPLORER_SIMULATED_ERROR_MESSAGE = "NEXT_DEVTOOLS_SIMULATED_ERROR"

type SegmentState = {
  boundaryType: SegmentBoundaryType | null
  setBoundaryType: (type: SegmentBoundaryType | null) => void
}

const SegmentStateContext = React.createContext<SegmentState>({
  boundaryType: null,
  setBoundaryType: () => {},
})

export function SegmentStateProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function useSegmentState() {
  return React.useContext(SegmentStateContext)
}

export function SegmentViewStateNode(_: { page: string }) {
  return null
}

export function SegmentBoundaryTriggerNode() {
  return null
}

export function SegmentViewNode(_: { type: string; pagePath: string; children?: React.ReactNode }) {
  return <>{_.children}</>
}

