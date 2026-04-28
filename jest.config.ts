import type { Config } from "jest"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
})

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    // ...
    "^@/app/(.*)$": "<rootDir>/src/app/$1",
    "^@/assets/(.*)$": "<rootDir>/src/assets/$1",
    "^@/components/(.*)$": "<rootDir>/src/components/$1",
    "^@/config/(.*)$": "<rootDir>/src/config/$1",
    "^@/graphql/(.*)$": "<rootDir>/src/graphql/$1",
    "^@/hooks/(.*)$": "<rootDir>/src/hooks/$1",
    "^@/lib/(.*)$": "<rootDir>/src/lib/$1",
    "^@/locales/(.*)$": "<rootDir>/src/locales/$1",
    "^@/mocks/(.*)$": "<rootDir>/src/mocks/$1",
    "^@/providers/(.*)$": "<rootDir>/src/providers/$1",
    "^@/store/(.*)$": "<rootDir>/src/store/$1",
    "^@/stories/(.*)$": "<rootDir>/src/stories/$1",
    "^@/theme/(.*)$": "<rootDir>/src/theme/$1",
    "^@/routes$": "<rootDir>/src/routes",
    "^@/middleware$": "<rootDir>/src/middleware",
  },
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
