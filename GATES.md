# GATES.md — Prometheus Security Hardening
# Scope: Seal all 7 critical gaps identified in the live security audit
# Date: 2026-09-23
# Branch: feat/thinking-orb-chat-indicator

## G1 — middleware.ts exists at repo root
CHECK: node -e "const fs=require('fs'); if(!fs.existsSync('middleware.ts'))throw new Error('missing'); console.log('G1 PASS');"
EXPECT: G1 PASS

## G2 — Security headers (CSP, X-Frame, HSTS, X-Content-Type-Options) present in middleware.ts
CHECK: node -e "const s=require('fs').readFileSync('middleware.ts','utf8'); const ok=['Content-Security-Policy','X-Frame-Options','Strict-Transport-Security','X-Content-Type-Options'].every(h=>s.includes(h)); if(!ok)throw new Error('headers missing'); console.log('G2 PASS');"
EXPECT: G2 PASS

## G3 — Rate limiting import and invocation present in middleware.ts
CHECK: node -e "const s=require('fs').readFileSync('middleware.ts','utf8'); if(!s.includes('Ratelimit')&&!s.includes('ratelimit'))throw new Error('no ratelimit'); if(!s.includes('@upstash'))throw new Error('no upstash'); console.log('G3 PASS');"
EXPECT: G3 PASS

## G4 — Auth guard on /api/projects (POST)
CHECK: node -e "const s=require('fs').readFileSync('app/api/projects/route.ts','utf8'); if(!s.includes('auth.getUser')&&!s.includes('createClient'))throw new Error('no auth'); if(!s.includes('Unauthorized')||!s.includes('401'))throw new Error('no 401'); console.log('G4 PASS');"
EXPECT: G4 PASS

## G5 — Auth guard on /api/prometheus-chat (POST)
CHECK: node -e "const s=require('fs').readFileSync('app/api/prometheus-chat/route.ts','utf8'); if(!s.includes('auth.getUser')&&!s.includes('createClient'))throw new Error('no auth'); if(!s.includes('401'))throw new Error('no 401'); console.log('G5 PASS');"
EXPECT: G5 PASS

## G6 — Auth guard on /api/prometheus-chat/transcribe (POST)
CHECK: node -e "const s=require('fs').readFileSync('app/api/prometheus-chat/transcribe/route.ts','utf8'); if(!s.includes('auth.getUser')&&!s.includes('createClient'))throw new Error('no auth'); if(!s.includes('401'))throw new Error('no 401'); console.log('G6 PASS');"
EXPECT: G6 PASS

## G7 — Auth guard on /api/music/library (POST)
CHECK: node -e "const s=require('fs').readFileSync('app/api/music/library/route.ts','utf8'); if(!s.includes('auth.getUser')&&!s.includes('createClient'))throw new Error('no auth'); if(!s.includes('401'))throw new Error('no 401'); console.log('G7 PASS');"
EXPECT: G7 PASS

## G8 — Auth guard on /api/music/match (POST)
CHECK: node -e "const s=require('fs').readFileSync('app/api/music/match/route.ts','utf8'); if(!s.includes('auth.getUser')&&!s.includes('createClient'))throw new Error('no auth'); if(!s.includes('401'))throw new Error('no 401'); console.log('G8 PASS');"
EXPECT: G8 PASS

## G9 — Auth guard on /api/music/recommendations (POST)
CHECK: node -e "const s=require('fs').readFileSync('app/api/music/recommendations/route.ts','utf8'); if(!s.includes('auth.getUser')&&!s.includes('createClient'))throw new Error('no auth'); if(!s.includes('401'))throw new Error('no 401'); console.log('G9 PASS');"
EXPECT: G9 PASS

## G10 — Auth guard on /api/cinematic/split-preview (POST)
CHECK: node -e "const s=require('fs').readFileSync('app/api/cinematic/split-preview/route.ts','utf8'); if(!s.includes('auth.getUser')&&!s.includes('createClient'))throw new Error('no auth'); if(!s.includes('401'))throw new Error('no 401'); console.log('G10 PASS');"
EXPECT: G10 PASS

## G11 — isomorphic-dompurify installed in package.json
CHECK: node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); if(!p.dependencies['isomorphic-dompurify'])throw new Error('not installed'); console.log('G11 PASS');"
EXPECT: G11 PASS

## G12 — Dependabot config exists at .github/dependabot.yml
CHECK: node -e "const fs=require('fs'); if(!fs.existsSync('.github/dependabot.yml'))throw new Error('missing'); const s=fs.readFileSync('.github/dependabot.yml','utf8'); if(!s.includes('npm'))throw new Error('no npm ecosystem'); console.log('G12 PASS');"
EXPECT: G12 PASS

## G13 — CodeQL workflow exists at .github/workflows/codeql.yml
CHECK: node -e "const fs=require('fs'); if(!fs.existsSync('.github/workflows/codeql.yml'))throw new Error('missing'); const s=fs.readFileSync('.github/workflows/codeql.yml','utf8'); if(!s.includes('codeql-action'))throw new Error('no codeql-action'); console.log('G13 PASS');"
EXPECT: G13 PASS

## G14 — All existing gateway tests still pass (regression)
CHECK: node tests/gateway-security-hardening.test.mjs
EXPECT: pass 12

## G15 — All existing voice companion tests still pass (regression)
CHECK: node tests/prometheus-jarvis-voice-companion.test.mjs
EXPECT: all checks passed

## G16 — TypeScript compiles clean with no errors
CHECK: cmd /c "set NODE_OPTIONS=--max-old-space-size=4096 && npx tsc --noEmit 2>&1 | findstr /I error || echo TSC CLEAN"
EXPECT: TSC CLEAN
