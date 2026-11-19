param([switch]$CheckOnly)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path $PSScriptRoot -Parent)
$root = (Get-Location).Path
$nextProcess = $null
$functionsProcess = $null
$hasMutex = $false
$mutex = [System.Threading.Mutex]::new($false, 'Local\TinyMeLocalLauncher')

function Invoke-Checked([string]$Program, [string[]]$Arguments) {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $Program $($Arguments -join ' ')" }
}

function Test-DockerReady {
    # Windows PowerShell 5 treats native stderr as an error record even when
    # Docker merely reports that its engine is still starting.
    $priorPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $docker info --format '{{.ServerVersion}}' *> $null
        return $LASTEXITCODE -eq 0
    } finally { $ErrorActionPreference = $priorPreference }
}

try {
    $hasMutex = $mutex.WaitOne(0)
    if (-not $hasMutex) { throw 'TinyMe launcher is already running. Use its window.' }
    $node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
    $npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
    if (-not $node -or -not $npm) { throw 'Install Node.js 24 LTS, then run this file again: https://nodejs.org/' }
    $nodeMajor = [int]((& $node --version).TrimStart('v').Split('.')[0])
    if ($nodeMajor -lt 24) { throw 'Node.js 24 or newer is required. Install Node.js 24 LTS.' }

    $docker = (Get-Command docker.exe -ErrorAction SilentlyContinue).Source
    if (-not $docker) {
        $dockerPath = Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin\docker.exe'
        if (Test-Path -LiteralPath $dockerPath) { $docker = $dockerPath; $env:PATH = "$(Split-Path $dockerPath);$env:PATH" }
    }
    if (-not $docker) { throw 'Docker Desktop is not installed. Install it with WSL2 / Linux containers: https://www.docker.com/products/docker-desktop/' }
    if ($CheckOnly) { Write-Host 'Prerequisites found: Node.js, npm, Docker.'; exit 0 }

    if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) {
        throw 'Port 3000 is busy. Stop the previous dev server (Ctrl+C in its terminal) and launch again.'
    }

    Write-Host '[1/6] Starting Docker Desktop...'
    if (-not (Test-DockerReady)) {
        $desktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
        if (-not (Test-Path -LiteralPath $desktop)) { throw 'Start your Docker engine, then launch TinyMe again.' }
        Start-Process -FilePath $desktop -WindowStyle Hidden
        $deadline = (Get-Date).AddMinutes(3)
        do {
            Start-Sleep -Seconds 2
            if (Test-DockerReady) { break }
        } while ((Get-Date) -lt $deadline)
        if (-not (Test-DockerReady)) { throw 'Docker did not start. Finish its WSL2 setup and select Linux containers.' }
    }

    Write-Host '[2/6] Checking npm dependencies...'
    $runDir = Join-Path $root '.local-run'
    New-Item -ItemType Directory -Path $runDir -Force | Out-Null
    $lockHash = (Get-FileHash -LiteralPath 'package-lock.json' -Algorithm SHA256).Hash
    $hashFile = Join-Path $runDir 'dependencies.hash'
    $savedHash = if (Test-Path -LiteralPath $hashFile) { Get-Content -LiteralPath $hashFile -Raw } else { '' }
    if ($savedHash.Trim() -ne $lockHash -or -not (Test-Path 'node_modules/next/dist/bin/next') -or -not (Test-Path 'node_modules/supabase/dist/supabase.js')) {
        Invoke-Checked $npm @('ci', '--no-audit', '--no-fund')
        Set-Content -LiteralPath $hashFile -Value $lockHash -NoNewline
    }

    Write-Host '[3/6] Starting database, authentication and storage (first launch downloads Docker images)...'
    $cli = Join-Path $root 'node_modules/supabase/dist/supabase.js'
    # Supabase status/start can print privileged keys. Never echo their output.
    $backendOutput = & $node $cli start --output json 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'Supabase startup failed. Check Docker, free ports 54320-54324, then run npm run backend:start for diagnostics.' }
    $backendOutput = $null
    Invoke-Checked $node @($cli, 'migration', 'up', '--local')

    Write-Host '[4/6] Preparing local configuration...'
    Invoke-Checked $node @('scripts/local-env.mjs')

    Write-Host '[5/6] Starting music service and website...'
    $functionsProcess = Start-Process -FilePath $node -ArgumentList @(('"' + $cli + '"'), 'functions', 'serve', 'music-library') -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runDir 'music.log') -RedirectStandardError (Join-Path $runDir 'music-error.log')
    $nextCli = Join-Path $root 'node_modules/next/dist/bin/next'
    $nextProcess = Start-Process -FilePath $node -ArgumentList @(('"' + $nextCli + '"'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3000') -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runDir 'site.log') -RedirectStandardError (Join-Path $runDir 'site-error.log')
    $deadline = (Get-Date).AddMinutes(3)
    $ready = $false
    do {
        if ($nextProcess.HasExited -or $functionsProcess.HasExited) { throw 'A service exited. See .local-run/site-error.log and .local-run/music-error.log.' }
        try { $response = Invoke-WebRequest 'http://127.0.0.1:3000/room' -UseBasicParsing -TimeoutSec 5; $ready = $response.StatusCode -eq 200 } catch { }
        if (-not $ready) { Start-Sleep -Seconds 2 }
    } while (-not $ready -and (Get-Date) -lt $deadline)
    if (-not $ready) { throw 'Website did not become ready. See .local-run/site-error.log.' }
    Write-Host '[6/6] Ready: http://127.0.0.1:3000/room'
    Write-Host 'Keep this window open. Ctrl+C stops the website and music service.'
    Write-Host 'Database containers remain running; stop them with: npm run backend:stop'
    Start-Process 'http://127.0.0.1:3000/room'
    while ($true) {
        Start-Sleep -Seconds 2
        if ($nextProcess.HasExited -or $functionsProcess.HasExited) { throw 'A service stopped. Check the logs in .local-run.' }
    }
} catch {
    Write-Host "`nTinyMe could not start: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    foreach ($child in @($nextProcess, $functionsProcess)) {
        if ($null -ne $child -and -not $child.HasExited) { & taskkill.exe /PID $child.Id /T /F *> $null }
    }
    if ($hasMutex) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
