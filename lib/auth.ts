import jwt from "jsonwebtoken"
import { getEnvSafe } from "./runtime-env"

export function signToken(payload: any) {
  const { JWT_SECRET, missing } = getEnvSafe()
  if (!JWT_SECRET || missing.includes("JWT_SECRET")) {
    throw new Error("Missing env: JWT_SECRET")
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" })
}

export function verifyToken(token: string) {
  const { JWT_SECRET, missing } = getEnvSafe()
  if (!JWT_SECRET || missing.includes("JWT_SECRET")) {
    throw new Error("Missing env: JWT_SECRET")
  }
  return jwt.verify(token, JWT_SECRET) as any
}
