# PowerShell script to check dev server errors
Write-Host "=== Checking Dev Server Status ===" -ForegroundColor Cyan
Write-Host ""

# Check if port 3000 is in use
Write-Host "1. Checking port 3000..." -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "   Port 3000 is IN USE by process ID: $($port3000.OwningProcess)" -ForegroundColor Red
    $process = Get-Process -Id $port3000.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "   Process: $($process.ProcessName)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   Port 3000 is FREE" -ForegroundColor Green
}

Write-Host ""
Write-Host "2. Checking Node processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   Found $($nodeProcesses.Count) Node process(es):" -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object {
        Write-Host "   - PID: $($_.Id), Started: $($_.StartTime)" -ForegroundColor Gray
    }
} else {
    Write-Host "   No Node processes running" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Checking .next folder..." -ForegroundColor Yellow
if (Test-Path .next) {
    Write-Host "   .next folder EXISTS" -ForegroundColor Green
    $nextFiles = Get-ChildItem .next -Recurse -File | Measure-Object
    Write-Host "   Contains $($nextFiles.Count) files" -ForegroundColor Gray
} else {
    Write-Host "   .next folder DOES NOT EXIST (server hasn't compiled)" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. Attempting to start dev server and capture errors..." -ForegroundColor Yellow
Write-Host "   (This will run for 10 seconds to capture startup errors)" -ForegroundColor Gray
Write-Host ""

# Try to start dev server and capture output
$job = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev 2>&1
}

Start-Sleep -Seconds 10

$output = Receive-Job $job
Stop-Job $job
Remove-Job $job

if ($output) {
    Write-Host "=== Dev Server Output ===" -ForegroundColor Cyan
    $output | ForEach-Object {
        if ($_ -match "error|Error|ERROR|failed|Failed|FAILED") {
            Write-Host $_ -ForegroundColor Red
        } else {
            Write-Host $_ -ForegroundColor White
        }
    }
} else {
    Write-Host "   No output captured (server may not have started)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Check Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you see errors above, copy them and share them." -ForegroundColor Yellow
Write-Host "If port 3000 is in use, try: npm run dev -- -p 3001" -ForegroundColor Yellow




