export function getEnv() {
  const {
    PROVIDER_BASE_URL,
    PUBLIC_TOKEN,
    OPERATOR_KEY,
    JWT_SECRET
  } = process.env

  if (!PROVIDER_BASE_URL || !PUBLIC_TOKEN || !OPERATOR_KEY || !JWT_SECRET) {
    throw new Error("Missing environment variables")
  }

  return { PROVIDER_BASE_URL, PUBLIC_TOKEN, OPERATOR_KEY, JWT_SECRET }
}
