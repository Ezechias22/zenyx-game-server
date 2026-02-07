'use server'
import { z } from 'zod'
import { readEnv } from '../lib/safe-env'
import { setAdminCookie } from '../lib/admin-auth'
const LoginSchema=z.object({token:z.string().min(1)})
export async function adminLogin(formData:FormData){
  const token=String(formData.get('token')||'')
  const parsed=LoginSchema.safeParse({token})
  if(!parsed.success) return {ok:false,error:'Token requis'}
  const env=readEnv()
  if(!env.ADMIN_TOKEN) return {ok:false,error:'ADMIN_TOKEN non configuré côté serveur'}
  if(parsed.data.token!==env.ADMIN_TOKEN) return {ok:false,error:'Token invalide'}
  setAdminCookie(parsed.data.token)
  return {ok:true}
}
