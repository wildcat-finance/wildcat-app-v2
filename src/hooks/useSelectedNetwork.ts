import { useAppSelector } from "@/store/hooks"

export const useSelectedNetwork = () =>
  useAppSelector((state) => state.selectedNetwork)
