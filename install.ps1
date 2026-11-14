[CmdletBinding()]
param(
    [string]$VaultPath = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$repo = "ZekiTRR/Discourse-obsidian"
$releaseBase = "https://github.com/$repo/releases/latest/download"
$pluginId = "discourse-theme-settings"

function Write-Utf8NoBom {
    param([string]$Path, [string]$Text)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    [IO.File]::WriteAllText($Path, $Text, [Text.UTF8Encoding]::new($false))
}

function Read-JsonSafe {
    param([string]$Path, $Fallback)
    if (-not (Test-Path $Path)) { return $Fallback }
    try {
        return (Get-Content -Path $Path -Raw | ConvertFrom-Json)
    } catch {
        Write-Warning "Could not read $Path — it will be recreated."
        return $Fallback
    }
}

$releaseInfo = $null
try {
    $releaseInfo = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" -Headers @{
        "User-Agent" = "discourse-installer"
        "Accept" = "application/vnd.github+json"
    }
} catch {
    Write-Warning "GitHub API is unavailable; falling back to latest/download. If installation fails, update Obsidian and try again."
}

function Get-ReleaseAssetUrl {
    param([string]$Name)
    if ($releaseInfo) {
        $asset = $releaseInfo.assets | Where-Object { $_.name -eq $Name } | Select-Object -First 1
        if ($asset -and $asset.browser_download_url) {
            return $asset.browser_download_url
        }
    }
    return "$releaseBase/$Name"
}

if (-not (Test-Path (Join-Path $VaultPath ".obsidian"))) {
    Write-Host "No Obsidian vault found in the current folder." -ForegroundColor Yellow
    $VaultPath = Read-Host "Enter the vault path (the folder that contains .obsidian)"
}

if (-not (Test-Path (Join-Path $VaultPath ".obsidian"))) {
    throw "Vault not found: $VaultPath"
}

$VaultPath = (Resolve-Path $VaultPath).Path
$obsidianDir = Join-Path $VaultPath ".obsidian"
$themesDir = Join-Path $obsidianDir "themes"
$pluginsDir = Join-Path $obsidianDir "plugins"

$temp = Join-Path ([IO.Path]::GetTempPath()) ("discourse-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $temp | Out-Null

try {
    $tag = if ($releaseInfo -and $releaseInfo.tag_name) { $releaseInfo.tag_name } else { "latest" }
    Write-Host "Downloading Discourse $tag from GitHub Releases..." -ForegroundColor Cyan

    $themeZip = Join-Path $temp "Discourse.zip"
    $pluginZip = Join-Path $temp "discourse-theme-settings.zip"

    Invoke-WebRequest -Uri (Get-ReleaseAssetUrl "Discourse.zip") -OutFile $themeZip -UseBasicParsing
    Invoke-WebRequest -Uri (Get-ReleaseAssetUrl "discourse-theme-settings.zip") -OutFile $pluginZip -UseBasicParsing

    Expand-Archive -Path $themeZip -DestinationPath (Join-Path $temp "theme") -Force
    Expand-Archive -Path $pluginZip -DestinationPath (Join-Path $temp "plugin") -Force

    $themeSource = Join-Path $temp "theme\Discourse"
    $pluginSource = Join-Path $temp "plugin\discourse-theme-settings"

    if (-not (Test-Path (Join-Path $themeSource "theme.css"))) {
        throw "theme.css was not found in the theme archive."
    }
    if (-not (Test-Path (Join-Path $pluginSource "main.js"))) {
        throw "main.js was not found in the plugin archive."
    }

    $themeTarget = Join-Path $themesDir "Discourse"
    $pluginTarget = Join-Path $pluginsDir $pluginId

    New-Item -ItemType Directory -Force -Path $themeTarget | Out-Null
    New-Item -ItemType Directory -Force -Path $pluginTarget | Out-Null

    Copy-Item -Path (Join-Path $themeSource "*") -Destination $themeTarget -Recurse -Force
    Copy-Item -Path (Join-Path $pluginSource "*") -Destination $pluginTarget -Recurse -Force

    # Enable the plugin without touching its data.json (if it exists).
    $communityPath = Join-Path $obsidianDir "community-plugins.json"
    $plugins = @(Read-JsonSafe -Path $communityPath -Fallback @())
    if ($plugins -notcontains $pluginId) {
        $plugins += $pluginId
    }
    Write-Utf8NoBom -Path $communityPath -Text (ConvertTo-Json -InputObject @($plugins) -Depth 10)

    # Select the theme without wiping other appearance settings.
    $appearancePath = Join-Path $obsidianDir "appearance.json"
    $appearance = Read-JsonSafe -Path $appearancePath -Fallback ([pscustomobject]@{})
    if ($null -eq $appearance) { $appearance = [pscustomobject]@{} }
    $appearance | Add-Member -NotePropertyName cssTheme -NotePropertyValue "Discourse" -Force
    Write-Utf8NoBom -Path $appearancePath -Text (ConvertTo-Json -InputObject $appearance -Depth 10)

    Write-Host ""
    Write-Host "Done." -ForegroundColor Green
    Write-Host "Theme:  $themeTarget"
    Write-Host "Plugin: $pluginTarget"
    Write-Host ""
    Write-Host "Restart Obsidian, then check:" -ForegroundColor Cyan
    Write-Host "  Settings → Appearance → Themes → Discourse"
    Write-Host "  Settings → Community plugins → Discourse Theme Settings"
    Write-Host ""
    Write-Host "If the theme does not appear, enable Community plugins and restart Obsidian again." -ForegroundColor DarkGray
} finally {
    Remove-Item -Path $temp -Recurse -Force -ErrorAction SilentlyContinue
}
