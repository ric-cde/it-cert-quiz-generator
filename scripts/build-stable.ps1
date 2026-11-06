<#
  Builds the app into ..\quiz-stable and runs it there on port 3200, so you can use it while work
  goes on in this folder. Only what the built app needs goes there: the frontend, the server, the
  database migrations and .env. It shares this project's packages through a folder link, and the
  dev database (data\dev), so your answers and imports show up in both.

    npm run build-stable    Build what's in this folder now, then run it in this terminal.
    npm run start-stable    Run the last build again, without building. Also: ..\quiz-stable\start-stable.cmd
    Ctrl+C stops it.

  /build-stable in Claude Code commits, then runs this with -NoStart: it stops the copy that's
  running and builds, and you start it again with npm run start-stable.
#>
param(
  [int]$Port = 3200,
  # Build, but don't start it.
  [switch]$NoStart,
  # Start the last build, without building.
  [switch]$StartOnly
)
$ErrorActionPreference = 'Stop'

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$stable = Join-Path (Split-Path $repo -Parent) 'quiz-stable'
$dataDir = Join-Path $repo 'data\dev'

function Step($text) { Write-Host "==> $text" }

function Stop-Stable {
  $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($owner in ($listening | Select-Object -ExpandProperty OwningProcess -Unique)) {
    Step "Stopping the stable copy that's running (process $owner)"
    Stop-Process -Id $owner -Force
  }
  if ($listening) { Start-Sleep -Seconds 1 }
}

function Build-Stable {
  $commit = git -C $repo log -1 --format='%h %s'
  $dirty = git -C $repo status --porcelain
  Step "Building $commit$(if ($dirty) { ', plus uncommitted changes' })"

  # The frontend and the server, straight into the stable folder.
  New-Item -ItemType Directory -Force $stable | Out-Null
  Push-Location $repo
  try {
    $env:VITE_CONFIG_NATIVE_IGNORE_WARNING = 'true'
    npx vite build --outDir (Join-Path $stable 'dist\client') --emptyOutDir --logLevel error
    if ($LASTEXITCODE -ne 0) { throw 'frontend build failed' }
    npx esbuild src/server/index.ts --bundle --platform=node --format=esm --packages=external --log-level=warning `
      "--outfile=$(Join-Path $stable 'dist\server\index.js')"
    if ($LASTEXITCODE -ne 0) { throw 'server build failed' }
  } finally {
    Pop-Location
  }

  # What the server reads at run time: migrations, the module type from package.json, and the API key.
  Remove-Item -Recurse -Force (Join-Path $stable 'drizzle') -ErrorAction SilentlyContinue
  Copy-Item -Recurse (Join-Path $repo 'drizzle') (Join-Path $stable 'drizzle')
  Copy-Item (Join-Path $repo 'package.json') $stable -Force
  if (Test-Path (Join-Path $repo '.env')) { Copy-Item (Join-Path $repo '.env') $stable -Force }
  Set-Content (Join-Path $stable 'BUILT-FROM.txt') "$commit$(if ($dirty) { ' (plus uncommitted changes)' })`r`nBuilt $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

  # The packages: a link to this project's, rather than a second install.
  $modules = Join-Path $stable 'node_modules'
  if (-not (Test-Path $modules)) {
    New-Item -ItemType Junction -Path $modules -Target (Join-Path $repo 'node_modules') | Out-Null
  }

  # For starting it by double-clicking, too.
  Set-Content (Join-Path $stable 'start-stable.cmd') @"
@echo off
cd /d "%~dp0"
set PORT=$Port
set DATA_DIR=$dataDir
node dist\server\index.js
"@
  Step 'Built'
}

Stop-Stable
if (-not $StartOnly) { Build-Stable }
if ($NoStart) {
  Step 'Start it with: npm run start-stable'
  exit 0
}

if (-not (Test-Path (Join-Path $stable 'dist\server\index.js'))) { throw 'Nothing built yet. Run npm run build-stable first.' }
Get-Content (Join-Path $stable 'BUILT-FROM.txt') -TotalCount 1 | ForEach-Object { Step "Running $_" }
Step "Open http://localhost:$Port  (Ctrl+C stops it)"
Push-Location $stable
try {
  $env:PORT = "$Port"
  $env:DATA_DIR = $dataDir
  node dist\server\index.js
} finally {
  Pop-Location
}
