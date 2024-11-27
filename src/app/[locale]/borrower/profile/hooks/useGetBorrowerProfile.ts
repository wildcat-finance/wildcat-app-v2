import { useQuery } from "@tanstack/react-query"

export const BORROWER_PROFILE_KEY = "borrower-profile-key"

const fetchBorrowerProfile = async () => {
  const response = await fetch(`/api/profiles/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-cache",
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch borrower profile: ${response.statusText}`)
  }

  const data = await response.json()
  return data.profile
}

export const useGetBorrowerProfile = () =>
  useQuery({
    queryKey: [BORROWER_PROFILE_KEY],
    queryFn: () => fetchBorrowerProfile(),
  })
