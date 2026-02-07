import 'server-only'
export type AppEnv={PROVIDER_BASE_URL?:string;PUBLIC_TOKEN?:string;OPERATOR_KEY?:string;ADMIN_TOKEN?:string;ALLOWED_IFRAME_ORIGINS?:string}
export function readEnv():AppEnv{ return {PROVIDER_BASE_URL:process.env.PROVIDER_BASE_URL,PUBLIC_TOKEN:process.env.PUBLIC_TOKEN,OPERATOR_KEY:process.env.OPERATOR_KEY,ADMIN_TOKEN:process.env.ADMIN_TOKEN,ALLOWED_IFRAME_ORIGINS:process.env.ALLOWED_IFRAME_ORIGINS} }
export function requireEnv<K extends keyof AppEnv>(env:AppEnv,key:K):string{ const v=env[key]; if(!v||!String(v).trim()) throw new Error(`Missing required environment variable: ${String(key)}`); return String(v).trim() }
export function parseAllowedOrigins(raw?:string):string[]{ if(!raw) return []; return raw.split(',').map(s=>s.trim()).filter(Boolean) }
