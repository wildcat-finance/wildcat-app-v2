import { QueryObserverResult, RefetchOptions } from "@tanstack/react-query"

export type TwoStepQueryHookResult<T> = {
  data: T
  isLoadingInitial: boolean
  isErrorInitial: boolean
  errorInitial: Error | null
  refetchInitial: (
    options?: RefetchOptions,
  ) => Promise<QueryObserverResult<T, Error>>

  isLoadingUpdate: boolean
  isPendingUpdate: boolean
  isErrorUpdate: boolean
  errorUpdate: Error | null
  refetchUpdate: (
    options?: RefetchOptions,
  ) => Promise<QueryObserverResult<T, Error>>
}
