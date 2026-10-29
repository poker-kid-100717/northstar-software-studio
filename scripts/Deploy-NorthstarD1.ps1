# Northstar D1 production migration runner. Requires PowerShell 7, Node/npm, Wrangler, gh.
# Dry-run by default; to apply: ./scripts/Deploy-NorthstarD1.ps1 -Apply -ConfirmDatabaseId <UUID>
[CmdletBinding()]
param(
  [switch]$Apply,
  [string]$ConfirmDatabaseId = '',
  [string]$Database = 'northstar-inquiries',
  [string]$DatabaseId = 'ef07d532-76a3-4a7e-bb1f-80fe4f021ec9',
  [string]$Repository = 'poker-kid-100717/northstar-software-studio',
  [switch]$RequireEncryptedBackup,
  [string]$BackupDirectory = (Join-Path $HOME 'NorthstarD1Backups')
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
function Run([string]$tool,[string[]]$arguments) {
  $output = & $tool @arguments 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) { throw "$tool failed (exit $LASTEXITCODE): $output" }
  return $output.Trim()
}
function Rows([string]$sql) {
  $raw = Run 'npx' @('--yes','wrangler','d1','execute',$Database,'--remote','--json','--command',$sql)
  try { $data = ConvertFrom-Json -InputObject $raw -Depth 40 } catch { throw "Unexpected Wrangler JSON response. Refusing to proceed." }
  $rows = @()
  foreach ($entry in @($data)) {
    if ($entry.success -eq $false) { throw "D1 query failed." }
    if ($null -ne $entry.results) { $rows += @($entry.results) }
    elseif ($null -ne $entry.result) {
      foreach ($inner in @($entry.result)) {
        if ($inner.success -eq $false) { throw "D1 query failed." }
        if ($null -ne $inner.results) { $rows += @($inner.results) }
      }
    }
  }
  return ,$rows
}
function Snapshot {
  $names = @{}
  foreach ($row in (Rows "SELECT type,name FROM sqlite_master WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%'")) {
    $names["$($row.type):$($row.name)"] = $true
  }
  foreach ($col in (Rows 'PRAGMA table_info(consultation_inquiries)')) { $names["column:$($col.name)"] = $true }
  return $names
}
function State([hashtable]$schema,[string[]]$markers) {
  $hit = @($markers | Where-Object { $schema.ContainsKey($_) }).Count
  if ($hit -eq 0) { return 'missing' }
  if ($hit -eq $markers.Count) { return 'present' }
  return 'partial'
}
$migrations = @(
  @{File='0003_commerce_foundation.sql';Markers=@('table:service_quotes','table:service_orders','table:commerce_events','table:payment_webhook_events','index:idx_service_quotes_inquiry','index:idx_service_quotes_status','index:idx_service_orders_status','index:idx_commerce_events_entity')},
  @{File='0004_quote_access.sql';Markers=@('table:quote_access_tokens','index:idx_quote_access_expiry')},
  @{File='0005_inquiry_lifecycle.sql';Markers=@('column:selected_service','column:source','column:idempotency_key','column:request_hash','column:read_at','column:follow_up_at','column:updated_by','column:notification_next_at','column:notification_lease','column:notification_lease_until','index:idx_inquiry_idempotency','index:idx_inquiry_email','table:inquiry_rate_limits','table:inquiry_events','trigger:inquiry_status_audit','trigger:inquiry_followup_audit','trigger:inquiry_delete_audit')},
  @{File='0006_inquiry_audit_actor.sql';Markers=@('trigger:inquiry_actor_reset')},
  @{File='0007_commercial_operating_ledger.sql';Markers=@('table:commercial_operating_entries','index:idx_commercial_operating_entries_date')}
)
Push-Location $root
try {
  foreach ($tool in @('git','npx','gh')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Missing CLI: $tool" }
  }
  $head = Run 'git' @('rev-parse','HEAD')
  Run 'git' @('fetch','origin','main') | Out-Null
  if ($head -ne (Run 'git' @('rev-parse','origin/main'))) { throw 'Checkout the latest main commit before running.' }
  if ((Run 'git' @('branch','--show-current')) -ne 'main') { throw 'Run from main, not a feature branch.' }
  if (Run 'git' @('status','--porcelain')) { throw 'Dirty working tree; stop.' }
  $dbList = ConvertFrom-Json -InputObject (Run 'npx' @('--yes','wrangler','d1','list','--json')) -Depth 20
  $matching = @($dbList | Where-Object { $_.name -eq $Database -and ($_.uuid -eq $DatabaseId -or $_.id -eq $DatabaseId) })
  if ($matching.Count -ne 1) { throw "Cloudflare D1 name/UUID mismatch for $Database. Refusing changes." }
  foreach ($migration in $migrations) {
    if (-not (Test-Path (Join-Path 'web/migrations' $migration.File))) { throw "Missing $($migration.File)" }
  }
  $schema = Snapshot
  if (-not $schema.ContainsKey('table:consultation_inquiries') -or -not $schema.ContainsKey('table:inquiry_activity')) { throw 'Baseline tables missing.' }
  if ($schema.ContainsKey('table:d1_migrations')) { throw 'D1 migration ledger exists. Reconcile manually rather than using direct SQL.' }
  foreach ($migration in $migrations) {
    $migration.Status = State $schema $migration.Markers
    if ($migration.Status -eq 'partial') { throw "Partial migration $($migration.File). Manual reconciliation required." }
    Write-Host "$($migration.File): $($migration.Status)"
  }
  if (-not $Apply) { Write-Host 'DRY RUN: no backup, migration, or workflow dispatch performed. Use -Apply with -ConfirmDatabaseId to proceed.'; return }
  if ($ConfirmDatabaseId -ne $DatabaseId) { throw 'For production execution, pass -ConfirmDatabaseId with the verified production UUID.' }
  if ($RequireEncryptedBackup -and -not $env:NORTHSTAR_D1_BACKUP_PASSPHRASE) { throw 'Missing protected backup encryption secret NORTHSTAR_D1_BACKUP_PASSPHRASE.' }
  if ($RequireEncryptedBackup -and -not (Get-Command 'openssl' -ErrorAction SilentlyContinue)) { throw 'OpenSSL is required for encrypted backup.' }
  Run 'gh' @('auth','status') | Out-Null
  New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null
  $backup = Join-Path $BackupDirectory ("northstar-inquiries-{0}.sql" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
  Run 'npx' @('--yes','wrangler','d1','export',$Database,'--remote','--output',$backup) | Out-Null
  if (-not (Test-Path $backup) -or (Get-Item $backup).Length -lt 500 -or -not (Select-String -LiteralPath $backup -Pattern 'consultation_inquiries' -SimpleMatch -Quiet)) {
    throw 'Production export verification failed; no migrations executed.'
  }
  if ($RequireEncryptedBackup) {
    $encrypted = "$backup.enc"
    try {
      Run 'openssl' @('enc','-aes-256-cbc','-pbkdf2','-iter','200000','-salt','-in',$backup,'-out',$encrypted,'-pass','env:NORTHSTAR_D1_BACKUP_PASSPHRASE') | Out-Null
      if (-not (Test-Path $encrypted) -or (Get-Item $encrypted).Length -lt 500) { throw 'Encrypted backup validation failed; migration refused.' }
    } finally {
      if (Test-Path $backup) { Remove-Item -LiteralPath $backup -Force }
    }
    Write-Host "Encrypted backup verified: $encrypted. Artifact must be retained securely."
  } else {
    Write-Host "Backup saved at $backup. Protect this file: it may contain customer information."
  }
  foreach ($migration in $migrations) {
    $current = State (Snapshot) $migration.Markers
    if ($current -eq 'present') { Write-Host "Skipping $($migration.File), already present"; continue }
    if ($current -ne 'missing') { throw "Unexpected partial state for $($migration.File). Stop." }
    Write-Host "Applying $($migration.File)"
    Run 'npx' @('--yes','wrangler','d1','execute',$Database,'--remote',("--file=web/migrations/" + $migration.File)) | Out-Null
    if ((State (Snapshot) $migration.Markers) -ne 'present') { throw "Verification failed for $($migration.File); workflow will NOT be dispatched." }
  }
  Run 'gh' @('workflow','run','validate-d1-migrations.yml','--ref','main','--repo',$Repository) | Out-Null
  Write-Host "Dispatched live schema validation: https://github.com/$Repository/actions/workflows/validate-d1-migrations.yml"
  Write-Host 'Deployment must remain blocked until the live workflow passes.'
}
finally { Pop-Location }
