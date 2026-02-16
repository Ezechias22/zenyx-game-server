type Env = {
  PROVIDER_BASE_URL: string
  PUBLIC_TOKEN: string
  OPERATOR_KEY: string
}

function must(name: keyof Env, v: string | undefined): string {
  const value = v?.trim()
  if (!value) throw new Error(`Missing env: ${name}`)
  return value
}

export function getEnv(): Env {
  return {
    PROVIDER_BASE_URL: must('PROVIDER_BASE_URL', process.env.PROVIDER_BASE_URL),
    PUBLIC_TOKEN: must('PUBLIC_TOKEN', process.env.PUBLIC_TOKEN),
    OPERATOR_KEY: must('OPERATOR_KEY', process.env.OPERATOR_KEY)
  }
}
