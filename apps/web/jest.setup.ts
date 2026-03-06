// Set required environment variables before any test module is loaded
process.env["NEXTAUTH_SECRET"] = "test-secret-for-jest-do-not-use-in-production";
process.env["NEXTAUTH_URL"] = "http://localhost:3000";
process.env["NEXT_PUBLIC_BASE_URL"] = "http://localhost:3000";
