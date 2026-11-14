[CmdletBinding()]
param(
    [string]$VaultPath = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$repo = "ZekiTRR/Discourse-obsidian"
$releaseBase = "https://github.com/$repo/releases/latest/download"
$pluginId = "neverlose-theme-settings"

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
        Write-Warning "Не удалось прочитать $Path — файл будет перезаписан."
        return $Fallback
    }
}

$releaseInfo = $null
try {
    $releaseInfo = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" -Headers @{
        "User-Agent" = "neverlose-installer"
        "Accept" = "application/vnd.github+json"
    }
} catch {
    Write-Warning "GitHub API недоступен, использую latest/download. Если установка упадёт, обнови Obsidian и повтори."
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
    Write-Host "В текущей папке нет Obsidian-vault." -ForegroundColor Yellow
    $VaultPath = Read-Host "Укажи путь к папке vault (где лежит .obsidian)"
}

if (-not (Test-Path (Join-Path $VaultPath ".obsidian"))) {
    throw "Vault не найден: $VaultPath"
}

$VaultPath = (Resolve-Path $VaultPath).Path
$obsidianDir = Join-Path $VaultPath ".obsidian"
$themesDir = Join-Path $obsidianDir "themes"
$pluginsDir = Join-Path $obsidianDir "plugins"

$temp = Join-Path ([IO.Path]::GetTempPath()) ("neverlose-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $temp | Out-Null

try {
    $tag = if ($releaseInfo -and $releaseInfo.tag_name) { $releaseInfo.tag_name } else { "latest" }
    Write-Host "Скачиваю Neverlose $tag из GitHub Releases..." -ForegroundColor Cyan

    $themeZip = Join-Path $temp "Neverlose.zip"
    $pluginZip = Join-Path $temp "neverlose-theme-settings.zip"

    Invoke-WebRequest -Uri (Get-ReleaseAssetUrl "Neverlose.zip") -OutFile $themeZip -UseBasicParsing
    Invoke-WebRequest -Uri (Get-ReleaseAssetUrl "neverlose-theme-settings.zip") -OutFile $pluginZip -UseBasicParsing

    Expand-Archive -Path $themeZip -DestinationPath (Join-Path $temp "theme") -Force
    Expand-Archive -Path $pluginZip -DestinationPath (Join-Path $temp "plugin") -Force

    $themeSource = Join-Path $temp "theme\Neverlose"
    $pluginSource = Join-Path $temp "plugin\neverlose-theme-settings"

    if (-not (Test-Path (Join-Path $themeSource "theme.css"))) {
        throw "В архиве темы не найден theme.css."
    }
    if (-not (Test-Path (Join-Path $pluginSource "main.js"))) {
        throw "В архиве плагина не найден main.js."
    }

    $themeTarget = Join-Path $themesDir "Neverlose"
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
    $appearance | Add-Member -NotePropertyName cssTheme -NotePropertyValue "Neverlose" -Force
    Write-Utf8NoBom -Path $appearancePath -Text (ConvertTo-Json -InputObject $appearance -Depth 10)

    Write-Host ""
    Write-Host "Готово." -ForegroundColor Green
    Write-Host "Тема:   $themeTarget"
    Write-Host "Плагин: $pluginTarget"
    Write-Host ""
    Write-Host "Перезапусти Obsidian, затем проверь:" -ForegroundColor Cyan
    Write-Host "  Settings → Appearance → Themes → Neverlose"
    Write-Host "  Settings → Community plugins → Neverlose Theme Settings"
    Write-Host ""
    Write-Host "Если тема не появилась, включи Community plugins и перезапусти Obsidian ещё раз." -ForegroundColor DarkGray
} finally {
    Remove-Item -Path $temp -Recurse -Force -ErrorAction SilentlyContinue
}
