export const refetchOnMountIfInvalidated = (query: {
  state: { isInvalidated: boolean }
}) => query.state.isInvalidated
