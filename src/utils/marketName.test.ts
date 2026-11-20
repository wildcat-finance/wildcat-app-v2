/** @jest-environment node */
import { toDeployedMarketName, toDeployedNamePrefix } from "./marketName"

// Observed on Sepolia: prefix "StormwindUSDC" over asset "USDC" deployed as
// "StormwindUSDC USDC". The MLA signed at creation names the market this way.
it("names the market as the deployed contract does", () => {
  expect(toDeployedMarketName("StormwindUSDC", "USDC")).toBe(
    "StormwindUSDC USDC",
  )
  expect(toDeployedMarketName("StormwindUSDC  ", "USDC")).toBe(
    "StormwindUSDC USDC",
  )
  expect(toDeployedNamePrefix("Wildcat Credit")).toBe("Wildcat Credit ")
})
