$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$local = Join-Path $root ".venv\Scripts\python.exe"
$fallback = "D:\WH\.venv\Scripts\python.exe"
if (Test-Path $local) {
    $python = $local
} elseif (Test-Path $fallback) {
    $python = $fallback
} else {
    throw "Python AI environment not found. Create .venv in this folder and pip install -r requirements.txt."
}
$env:WH_ROOT = $root
Start-Process -FilePath $python -ArgumentList "server\main.py" -WorkingDirectory $root
Set-Location $root
npm run dev:clinic
