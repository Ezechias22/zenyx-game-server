import { isAdminAuthed } from '../lib/admin-auth'
import { adminLogin } from './actions'
import { Button, Card, Input } from '../components/ui'
import AdminDashboard from './admin-dashboard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HomePage() {
  const authed = isAdminAuthed()

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-6">
          <div className="text-lg font-bold">Accès admin</div>
          <div className="mt-1 text-sm text-white/70">AUTH=false</div>

          <form action={adminLogin} className="mt-6 space-y-3">
            <div className="space-y-1">
              <label htmlFor="token" className="text-xs font-semibold text-white/80">
                ADMIN_TOKEN
              </label>
              <Input id="token" name="token" type="password" autoComplete="off" required />
            </div>

            <Button type="submit" className="w-full">
              Se connecter
            </Button>
          </form>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-sm text-white/70">AUTH=true</div>
        <div className="mt-2 text-sm text-white/60">RENDER=AdminDashboard</div>
        <div className="mt-6">
          <AdminDashboard />
        </div>
      </div>
    </main>
  )
}
