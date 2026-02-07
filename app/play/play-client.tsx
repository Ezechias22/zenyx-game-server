'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button, Card, Input } from '../../components/ui'

type PlayResult = any

function pick<T = any>(obj: any, paths: string[], fallback?: T): T | undefined {
  for (const p of paths) {
    const parts = p.split('.')
    let cur = obj
    let ok = true
    for (const part of parts) {
      if (cur && typeof cur === 'object' && part in cur) cur = cur[part]
      else {
        ok = false
        break
      }
    }
    if (ok && cur !== undefined && cur !== null) return cur as T
  }
  return fallback
}

function asNumber(v: any): number | null {
  const n = typeof v === 'number' ? v : v != null ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}

function safeJson(text: string) {
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

export default function PlayClient() {
  const sp = useSearchParams()
  const gameCode = sp.get('gameCode') || ''
  const sessionIdFromUrl = sp.get('sessionId') || ''

  const [sessionId, setSessionId] = useState<string>(sessionIdFromUrl)
  const [title, setTitle] = useState<string>(gameCode ? gameCode.split('_').map(w => w[0]?.toUpperCase()+w.slice(1)).join(' ') : 'Game')
  const [bet, setBet] = useState<number>(1)
  const [balance, setBalance] = useState<number | null>(null)
  const [win, setWin] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<string>('')

  const booted = useRef(false)

  const canStart = useMemo(() => !!(sessionId || gameCode), [sessionId, gameCode])

  useEffect(() => {
    if (booted.current) return
    booted.current = true
    if (sessionIdFromUrl) return
    if (!gameCode) {
      setLog('Erreur: gameCode manquant.')
      return
    }
    void createSession(gameCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createSession(gc: string) {
    setBusy(true)
    setLog('Création session…')
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          gameCode: gc,
          playerExternalId: 'player_demo_123',
          currency: 'BRL',
        }),
      })
      const text = await res.text()
      const j = safeJson(text)

      if (!res.ok) {
        setLog(`Erreur /api/session status=${res.status}\n${text}`)
        return
      }

      const sid =
        pick<string>(j, ['sessionId', 'session_id', 'data.sessionId', 'data.session_id']) ||
        pick<string>(j, ['session.id', 'data.session.id'])

      const launchUrl =
        pick<string>(j, ['launchUrl', 'launch_url', 'data.launchUrl', 'data.launch_url']) ||
        pick<string>(j, ['url', 'data.url'])

      const bal =
        asNumber(pick(j, ['balance', 'wallet.balance', 'data.balance', 'data.wallet.balance'])) ??
        null

      if (bal !== null) setBalance(bal)

      if (!sid) {
        setLog(`Session créée mais sessionId introuvable.\n${text}`)
        return
      }

      setSessionId(sid)
      setTitle(titleFromId(gc))

      // Si provider renvoie un launchUrl, on l'ouvre en iframe dans la même page (optionnel),
      // mais on garde le mode direct sessionId pour /api/play.
      if (launchUrl) {
        setLog(`Session: ${sid}\nlaunchUrl: ${launchUrl}`)
      } else {
        setLog(`Session: ${sid}`)
      }

      // Mettre l'URL à jour pour permettre refresh
      const url = new URL(window.location.href)
      url.searchParams.set('sessionId', sid)
      url.searchParams.set('gameCode', gc)
      window.history.replaceState({}, '', url.toString())
    } finally {
      setBusy(false)
    }
  }

  function titleFromId(id: string) {
    return id
      .split('_')
      .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
      .join(' ')
  }

  async function spin() {
    if (!sessionId) {
      setLog('Erreur: sessionId manquant.')
      return
    }
    setBusy(true)
    setWin(null)
    setLog('SPIN…')
    try {
      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, bet: Number(bet) }),
      })
      const text = await res.text()
      const j: PlayResult = safeJson(text)

      if (!res.ok) {
        setLog(`Erreur /api/play status=${res.status}\n${text}`)
        return
      }

      const newBal =
        asNumber(pick(j, ['balance', 'wallet.balance', 'data.balance', 'data.wallet.balance'])) ??
        null
      const newWin =
        asNumber(pick(j, ['win', 'payout', 'data.win', 'data.payout', 'result.win', 'result.payout'])) ??
        null

      if (newBal !== null) setBalance(newBal)
      if (newWin !== null) setWin(newWin)

      setLog(`OK /api/play\n${text.slice(0, 3000)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <Card className="p-4">
          <div className="text-xl font-extrabold">{title}</div>
          <div className="mt-2 text-sm text-white/70">Session: {sessionId || '—'}</div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-xs text-white/60">Bet</div>
              <Input
                value={String(bet)}
                onChange={(e) => setBet(Number(e.target.value || 1))}
                inputMode="decimal"
              />
            </div>

            <Button disabled={!canStart || busy} onClick={spin}>
              SPIN
            </Button>

            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => window.location.reload()}
            >
              Recharger
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="text-xs text-white/60">Balance</div>
              <div className="mt-1 text-lg font-bold">{balance === null ? '—' : balance}</div>
            </Card>

            <Card className="p-4">
              <div className="text-xs text-white/60">Win</div>
              <div className="mt-1 text-lg font-bold">{win === null ? '—' : win}</div>
            </Card>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-white/60">Retour console</div>
          <pre className="mt-2 whitespace-pre-wrap break-words text-[12px] text-white/80">
            {log || '—'}
          </pre>
        </Card>
      </div>
    </main>
  )
}
