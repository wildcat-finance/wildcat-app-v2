import { useAppSelector } from "@/store/hooks"

export const useSelectedNetwork = () =>
  useAppSelector((state) => state.selectedNetwork)

export const useIsSelectedNetworkRehydrated = () =>
  useAppSelector((state) => {
    const persistence = Reflect.get(state.selectedNetwork, "_persist") as
      | { rehydrated?: boolean }
      | undefined
    return persistence?.rehydrated ?? false
  })
