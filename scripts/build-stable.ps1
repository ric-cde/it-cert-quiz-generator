<#
  Builds and runs a stable copy of the last commit on main, in ..\quiz-stable, so you can use the
  app while work goes on in this folder. It shares the dev database (data\dev), so your answers
  and imports show up in both.

  Run it from anywhere: powershell -ExecutionPolicy Bypass -File scripts\build-stable.ps1
  Then open http://localhost:3200. Run it again to update to the latest commit.
#>
param(
  [int]$Port = 3200
)
$ErrorActionPreference = 'Stop'

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$stable = Join-Path (Split-Path $repo -Parent) 'quiz-stable'
$dataDir = Join-Path $repo 'data\dev'

function Step($text) { Write-Host "==> $text" }

# 1. Stop the copy that's running, so its files aren't locked while they're replaced.
$listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
foreach ($owner in ($listening | Select-Object -ExpandProperty OwningProcess -Unique)) {
  Step "Stopping the running stable copy (process $owner)"
  Stop-Process -Id $owner -Force
}
if ($listening) { Start-Sleep -Seconds 1 }

# 2. Check out the latest commit on main. Detached, because main is already checked out here.
if (-not (Test-Path (Join-Path $stable '.git'))) {
  Step "Creating $stable from main"
  git -C $repo worktree add --detach $stable main
} else {
  Step "Updating $stable to the latest commit on main"
  git -C $stable checkout --detach --force main
}
if ($LASTEXITCODE -ne 0) { throw 'git failed' }
git -C $stable log -1 --format='    %h %s'

# The API key, for features that call Claude. It's never committed, so copy it across.
if (Test-Path (Join-Path $repo '.env')) { Copy-Item (Join-Path $repo '.env') (Join-Path $stable '.env') -Force }

Push-Location $stable
try {
  # 3. Install packages, but only when the lock file has changed since the last install.
  $lockHash = (Get-FileHash 'package-lock.json').Hash
  $stamp = 'node_modules\.stable-lock-hash'
  if (-not (Test-Path $stamp) -or (Get-Content $stamp) -ne $lockHash) {
    Step 'Installing packages'
    npm ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
    Set-Content $stamp $lockHash
  } else {
    Step 'Packages are up to date'
  }

  # 4. Build.
  Step 'Building'
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'build failed' }

  # 5. Start it in its own hidden process, so it keeps running after this script ends.
  Step "Starting on port $Port with the database in $dataDir"
  $env:PORT = "$Port"
  $env:DATA_DIR = $dataDir
  Start-Process node -ArgumentList 'dist/server/index.js' -WorkingDirectory $stable -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $stable 'stable.log') -RedirectStandardError (Join-Path $stable 'stable-error.log')

  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
      Step "Ready: http://localhost:$Port"
      exit 0
    }
  }
  throw "It didn't start. See $stable\stable-error.log"
} finally {
  Pop-Location
}
