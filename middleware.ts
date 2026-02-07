import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  console.error('[MIDDLEWARE] url=', req.url)
  console.error('[MIDDLEWARE] nextUrl.href=', req.nextUrl.href)
  console.error('[MIDDLEWARE] nextUrl.origin=', req.nextUrl.origin)

  return NextResponse.next()
}

export const config = {
  matcher: ['/:path*'],
}
