import 'server-only'
import { z } from 'zod'
export async function fetchJson(input:RequestInfo|URL, init?:RequestInit){ const res=await fetch(input, init); const text=await res.text(); let data:unknown=null; try{data=text?JSON.parse(text):null}catch{data=text}; return {res,data} }
export const ProviderErrorSchema=z.object({error:z.string().optional(),message:z.string().optional(),statusCode:z.number().optional()})
export function normalizeError(data:unknown):string{ const p=ProviderErrorSchema.safeParse(data); if(p.success) return p.data.message||p.data.error||'Request failed'; if(typeof data==='string'&&data.trim()) return data.trim(); return 'Request failed' }
