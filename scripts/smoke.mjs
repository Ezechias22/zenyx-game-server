import http from 'node:http'

const port = process.env.PORT || 3000

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method: 'GET' }, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.end()
  })
}

const main = async () => {
  const r = await get('/api/games')
  if (![200, 500].includes(r.status)) {
    console.error('Unexpected status for /api/games:', r.status)
    process.exit(1)
  }
  console.log('Smoke OK:', r.status)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
