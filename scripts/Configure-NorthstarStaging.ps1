#Requires -Version 7.0
<#
.SYNOPSIS
  Configures only Northstar Cloudflare Pages Preview variables (dry-run by default).
.EXAMPLE
  ./scripts/Configure-NorthstarStaging.ps1 -TeamDomain crimson-art-5ed6.cloudflareaccess.com -AccessAudience <staging-aud> -AdminEmail owner@example.com
.EXAMPLE
  ./scripts/Configure-NorthstarStaging.ps1 -TeamDomain crimson-art-5ed6.cloudflareaccess.com -AccessAudience <staging-aud> -AdminEmail owner@example.com -Apply
#>
[CmdletBinding()]
param(
 [switch]$Apply,
 [Parameter(Mandatory)][string]$TeamDomain,
 [Parameter(Mandatory)][string]$AccessAudience,
 [Parameter(Mandatory)][string]$AdminEmail,
 [string]$AccountId='961daf5c86645f2e06c6c86c6156db39',
 [string]$Project='northstar-software-studio',
 [string]$StagingDatabaseId='042bf88c-090e-43bd-969a-ff0f7d2feebd'
)
$ErrorActionPreference='Stop'
$endpoint="https://api.cloudflare.com/client/v4/accounts/$AccountId/pages/projects/$Project"
if($AccountId -ne '961daf5c86645f2e06c6c86c6156db39' -or $Project -ne 'northstar-software-studio') {throw 'Unexpected Cloudflare account or project.'}
if($TeamDomain -notmatch '^[a-z0-9-]+\.cloudflareaccess\.com$'){throw 'Invalid Access team domain.'}
if([string]::IsNullOrWhiteSpace($AccessAudience) -or $AccessAudience.Length -lt 10){throw 'Provide the dedicated staging Access application audience.'}
if($AdminEmail -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$'){throw 'Invalid staging owner email.'}
$token=$env:CLOUDFLARE_API_TOKEN
if(-not $token){
 $secure=Read-Host -AsSecureString 'Cloudflare API token (Pages Read + Write; never stored)'
 $token=[System.Net.NetworkCredential]::new('', $secure).Password
}
if(-not $token){throw 'API token is required.'}
$headers=@{Authorization="Bearer $token"}
try {
 $response=Invoke-RestMethod -Method Get -Uri $endpoint -Headers $headers
 if(-not $response.success){throw 'Cloudflare project lookup failed.'}
 $projectData=$response.result
 if($projectData.name -ne $Project){throw 'Project identity mismatch.'}
 $preview=$projectData.deployment_configs.preview
 if(-not $preview){throw 'Missing Pages Preview config.'}
 $previewDb=$preview.d1_databases.INQUIRIES_DB.id
 if($previewDb -ne $StagingDatabaseId){throw "Preview INQUIRIES_DB must be bound to staging D1 $StagingDatabaseId. Refusing update."}
 $prodDb=$projectData.deployment_configs.production.d1_databases.INQUIRIES_DB.id
 if($prodDb -eq $StagingDatabaseId){throw 'Production is pointing to staging D1. Refusing update.'}
 $current=$preview.env_vars
 $keys=@('TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','CF_ACCESS_TEAM_DOMAIN','CF_ACCESS_AUD','CF_ACCESS_ADMIN_EMAIL','QUOTE_ACCEPTANCE_ENABLED')
 foreach($key in $keys){if($null -ne $current.$key){Write-Host "$key currently defined in Preview (will replace)" } else {Write-Host "$key not yet defined in Preview"}}
 Write-Host "Verified Preview D1 binding: $previewDb; production D1 differs. Mode: $(if($Apply){'APPLY'}else{'DRY RUN'})."
 if(-not $Apply){Write-Host 'No changes made. Rerun with -Apply after checking Access application and email.';return}
 # PATCH only these six Preview env_vars. No production configuration or other binding is sent.
 # Cloudflare Pages env_vars PATCH supports per-key updates; null is required to delete a key.
 $variables=@{
  TURNSTILE_SITE_KEY=@{type='plain_text';value='1x00000000000000000000AA'}
  TURNSTILE_SECRET_KEY=@{type='secret_text';value='1x0000000000000000000000000000000AA'}
  CF_ACCESS_TEAM_DOMAIN=@{type='plain_text';value=$TeamDomain}
  CF_ACCESS_AUD=@{type='plain_text';value=$AccessAudience}
  CF_ACCESS_ADMIN_EMAIL=@{type='plain_text';value=$AdminEmail}
  QUOTE_ACCEPTANCE_ENABLED=@{type='plain_text';value='true'}
 }
 $body=@{deployment_configs=@{preview=@{env_vars=$variables}}}|ConvertTo-Json -Depth 12 -Compress
 $update=Invoke-RestMethod -Method Patch -Uri $endpoint -Headers $headers -ContentType 'application/json' -Body $body
 if(-not $update.success){throw 'Cloudflare rejected Preview update.'}
 $after=(Invoke-RestMethod -Method Get -Uri $endpoint -Headers $headers).result
 if($after.deployment_configs.preview.d1_databases.INQUIRIES_DB.id -ne $StagingDatabaseId){throw 'Preview database binding changed unexpectedly.'}
 if($after.deployment_configs.production.d1_databases.INQUIRIES_DB.id -ne $prodDb){throw 'Production database binding changed unexpectedly.'}
 foreach($key in $keys){if($null -eq $after.deployment_configs.preview.env_vars.$key){throw "Missing Preview setting after update: $key"}}
 Write-Host 'Six Preview settings configured and verified by name. No secret values printed. Redeploy preview to activate.'
} finally {
 $headers.Authorization=$null
 $token=$null
}
