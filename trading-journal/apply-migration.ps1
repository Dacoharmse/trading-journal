# PowerShell script to apply Supabase migration
# Reads the migration SQL file and executes it via Supabase Management API

Write-Host "🚀 Applying Supabase Migration..." -ForegroundColor Cyan
Write-Host ""

# Read environment variables from .env.local
$envPath = Join-Path $PSScriptRoot ".env.local"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$supabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$serviceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $supabaseUrl -or -not $serviceRoleKey) {
    Write-Host "❌ Error: Missing Supabase credentials in .env.local" -ForegroundColor Red
    exit 1
}

# Extract project ref from URL
$projectRef = ($supabaseUrl -replace 'https://', '' -split '\.')[0]
Write-Host "📦 Project: $projectRef" -ForegroundColor Green
Write-Host ""

# Read the migration file
$migrationPath = Join-Path $PSScriptRoot "supabase\migrations\20241122000000_add_missing_user_profile_columns.sql"
if (-not (Test-Path $migrationPath)) {
    Write-Host "❌ Error: Migration file not found at $migrationPath" -ForegroundColor Red
    exit 1
}

$migrationSQL = Get-Content $migrationPath -Raw

Write-Host "📝 Executing migration SQL..." -ForegroundColor Yellow
Write-Host ""

# Execute SQL via Supabase REST API query endpoint
# We'll use PostgreSQL's connection to execute raw SQL
$headers = @{
    "apikey" = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
}

# Try to execute the SQL using the database REST API
try {
    # Use the PostgREST endpoint to execute raw SQL
    # Note: This requires creating a custom RPC function or using the query parameter

    Write-Host "⚠️  Direct SQL execution via REST API is not supported." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 Please apply the migration manually:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Go to: https://supabase.com/dashboard/project/$projectRef/sql/new" -ForegroundColor White
    Write-Host "2. Copy the contents of:" -ForegroundColor White
    Write-Host "   $migrationPath" -ForegroundColor Gray
    Write-Host "3. Paste into the SQL Editor" -ForegroundColor White
    Write-Host "4. Click 'Run' to execute" -ForegroundColor White
    Write-Host ""
    Write-Host "Or open the migration file now? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host

    if ($response -eq 'Y' -or $response -eq 'y') {
        Start-Process $migrationPath
        Write-Host "✅ Migration file opened!" -ForegroundColor Green
        Write-Host "Copy its contents to the Supabase SQL Editor." -ForegroundColor White
    }

} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}
