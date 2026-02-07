export function debugNewURL(input: any, base?: any) {
  console.error('[DEBUG][new URL] input=', input, 'base=', base)
  return new URL(input as any, base as any)
}
