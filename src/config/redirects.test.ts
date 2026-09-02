/* eslint-disable import/no-extraneous-dependencies */

type Redirect = {
  source: string
  destination: string
  permanent: boolean
}

describe("legacy profile redirects", () => {
  it("sends lender-side borrower profile links to the public profile", async () => {
    const configPath = "../../next.config.mjs"
    const nextConfig = (await import(configPath)).default as {
      redirects: () => Promise<Redirect[]>
    }

    await expect(nextConfig.redirects()).resolves.toContainEqual({
      source: "/lender/profile/:address",
      destination: "/profile/borrower/:address",
      permanent: false,
    })
  })
})
