// scripts/download-openapi.js
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

const NEXT_PUBLIC_API_BASEURL = process.env.NEXT_PUBLIC_API_BASEURL
if (!NEXT_PUBLIC_API_BASEURL) {
  console.error(
    'ERROR: NEXT_PUBLIC_API_BASEURL not set. Check .env or environment.'
  )
  process.exit(2)
}

let rawUrl
try {
  // Ensure base URL is valid and append /schema/ reliably
  const base = new URL(NEXT_PUBLIC_API_BASEURL)
  rawUrl = new URL('/openapi.json', base).toString()
} catch (err) {
  console.error(
    'ERROR: NEXT_PUBLIC_API_BASEURL is not a valid URL:',
    err.message
  )
  process.exit(2)
}

const outPath = path.resolve(process.cwd(), 'openapi.json')
const timeoutMs = Number(process.env.OPENAPI_DOWNLOAD_TIMEOUT_MS || 15000) // 15s default

console.log('Downloading', rawUrl)

function cleanupAndExit(code, msg) {
  try {
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath)
  } catch (e) {
    /* ignore */
  }
  if (msg) console.error(msg)
  process.exit(code)
}

async function run() {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(rawUrl, {
      method: 'GET',
      headers: {
        Accept:
          'application/json, application/*+json, application/yaml, text/yaml, text/plain',
      },
      redirect: 'follow',
      signal: controller.signal,
    })
    clearTimeout(id)

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      cleanupAndExit(
        3,
        `Failed to download: ${res.status} ${res.statusText}\n${body}`
      )
      return
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase()
    const text = await res.text()

    let out = text
    const looksLikeYaml =
      contentType.includes('yaml') ||
      contentType.includes('yml') ||
      text.trimStart().startsWith('---') ||
      (/^[\w-]+:\s/m.test(text) && !text.trimStart().startsWith('{'))

    if (looksLikeYaml) {
      // try to convert using js-yaml if available; otherwise write raw response
      try {
        const yaml = require('js-yaml')
        const parsed = yaml.load(text)
        out = JSON.stringify(parsed, null, 2)
        console.log('Converted YAML → JSON')
      } catch (e) {
        console.warn(
          'js-yaml not available or failed to parse YAML; writing raw response. To auto-convert, run: npm install js-yaml'
        )
        out = text
      }
    } else {
      // ensure pretty-printed JSON if possible
      try {
        const parsed = JSON.parse(text)
        out = JSON.stringify(parsed, null, 2)
      } catch (e) {
        // not JSON — keep raw text
        out = text
      }
    }

    fs.writeFileSync(outPath, out, 'utf8')
    console.log('Saved', outPath)
    process.exit(0)
  } catch (err) {
    if (err.name === 'AbortError') {
      cleanupAndExit(4, `Request timed out after ${timeoutMs}ms`)
    } else {
      cleanupAndExit(5, 'Request error: ' + (err.message || String(err)))
    }
  }
}

run()
