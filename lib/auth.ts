import jwt from "jsonwebtoken"
import { getEnv } from "./runtime-env"

export function signToken(payload: any) {
  const { JWT_SECRET } = getEnv()
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" })
}

export function verifyToken(token: string) {
  const { JWT_SECRET } = getEnv()
  return jwt.verify(token, JWT_SECRET) as any
}
