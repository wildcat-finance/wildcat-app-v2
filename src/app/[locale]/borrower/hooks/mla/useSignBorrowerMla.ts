import { useQuery } from "@tanstack/react-query"

const GET_BORROWER_PROFILE_KEY = "GET_BORROWER_PROFILE"

const useBorrowerProfile = () => {
  const { data, ...result } = useQuery({
    queryKey: [GET_BORROWER_PROFILE_KEY],
    queryFn: async () => {
      const response = await fetch("/api/borrower/profile")
      return response.json()
    },
  })

  return { data, ...result }
}

export const useSignBorrowerMla = () => {
  const { data, ...result } = useQuery({
    queryKey: [GET_BORROWER_PROFILE_KEY],
    queryFn: async () => {
      const response = await fetch("/api/borrower/profile")
      return response.json()
    },
  })
}
