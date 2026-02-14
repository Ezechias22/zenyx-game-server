export function getEnvSafe() {
  const {
    PROVIDER_BASE_URL,
    PUBLIC_TOKEN,
    OPERATOR_KEY,
    JWT_SECRET,
    DATABASE_URL
  } = process.env

  const missing: string[] = []
  if (!PROVIDER_BASE_URL) missing.push("PROVIDER_BASE_URL")
  if (!PUBLIC_TOKEN) missing.push("PUBLIC_TOKEN")
  if (!OPERATOR_KEY) missing.push("OPERATOR_KEY")
  if (!JWT_SECRET) missing.push("JWT_SECRET")
  if (!DATABASE_URL) missing.push("DATABASE_URL")

  return {
    PROVIDER_BASE_URL,
    PUBLIC_TOKEN,
    OPERATOR_KEY,
    JWT_SECRET,
    DATABASE_URL,
    missing
  }
}
