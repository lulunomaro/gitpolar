[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$Source,
  [string]$Preview,
  [string]$Configuration = '',
  [switch]$RegisterOnly,
  [switch]$Incremental
)
$ErrorActionPreference = 'Stop'
if ($Incremental) {
  if (-not $Source) { throw 'Source is required for incremental project previews.' }
  & (Join-Path $PSScriptRoot 'Export-SolidWorksProject.ps1') -RepoRoot $RepoRoot -Source $Source -Configuration $Configuration
  if (-not $?) { throw 'Incremental preview export failed.' }
  return
}
$utf8 = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8
$nativeExtensions = @('.sldasm','.sldprt','.slddrw','.sldlfp','.slddrt','.prtdot','.asmdot','.drwdot')
$repoOutput = & git -C $RepoRoot rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0) { throw 'RepoRoot must be a Git working copy with Git LFS installed.' }
$projectRoot = [IO.Path]::GetFullPath(($repoOutput -join '').Trim()).TrimEnd([IO.Path]::DirectorySeparatorChar)
$projectPrefix = $projectRoot + [IO.Path]::DirectorySeparatorChar
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Resolve-ProjectPath([string]$Value, [switch]$MustExist) {
  $absolute = if ([IO.Path]::IsPathRooted($Value)) { [IO.Path]::GetFullPath($Value) } else { [IO.Path]::GetFullPath((Join-Path $projectRoot $Value)) }
  if (-not $absolute.StartsWith($projectPrefix,[StringComparison]::OrdinalIgnoreCase)) { throw 'All CAD sources and previews must be inside this repository.' }
  if ($MustExist -and -not [IO.File]::Exists($absolute)) { throw ('File not found: ' + $absolute) }
  return $absolute
}
function Relative-ProjectPath([string]$Absolute) {
  return $Absolute.Substring($projectPrefix.Length).Replace([char]92,[char]47)
}
function Git-BlobId([string]$Relative) {
  $hash = & git -C $projectRoot hash-object ('--path=' + $Relative) -- (Join-Path $projectRoot $Relative)
  if ($LASTEXITCODE -ne 0 -or ($hash -join '').Trim() -notmatch '^[0-9a-f]{40}$') { throw ('Git could not hash ' + $Relative + '. Check Git LFS installation.') }
  return ($hash -join '').Trim()
}
function Get-ProjectFingerprint {
  $output = & git -c core.quotepath=false -C $projectRoot ls-files -z --cached --others --exclude-standard
  if ($LASTEXITCODE -ne 0) { throw 'Cannot list CAD project files.' }
  $paths = New-Object 'System.Collections.Generic.List[string]'
  foreach ($entry in (($output -join ([string][char]10)).Split([char]0,[StringSplitOptions]::RemoveEmptyEntries))) {
    if ($nativeExtensions -contains [IO.Path]::GetExtension($entry).ToLowerInvariant()) {
      if (-not [IO.File]::Exists((Join-Path $projectRoot $entry))) { continue }
      $paths.Add($entry)
    }
  }
  $paths.Sort([StringComparer]::Ordinal)
  $content = New-Object System.Text.StringBuilder
  [void]$content.Append('gitpolar-cad-v1').Append([char]10)
  foreach ($entry in $paths) { [void]$content.Append($entry).Append([char]0).Append((Git-BlobId $entry)).Append([char]10) }
  $algorithm = [Security.Cryptography.SHA256]::Create()
  try { return [BitConverter]::ToString($algorithm.ComputeHash($utf8.GetBytes($content.ToString()))).Replace('-','').ToLowerInvariant() } finally { $algorithm.Dispose() }
}

if (-not $RegisterOnly) {
  try { $solidworks = [Runtime.InteropServices.Marshal]::GetActiveObject('SldWorks.Application') } catch { throw 'Open SolidWorks and the saved assembly/part to preview, then run this script again. Use -RegisterOnly for an already exported STEP/STL.' }
  $document = $solidworks.ActiveDoc
  if ($null -eq $document) { throw 'No active SolidWorks document.' }
  $activePath = $document.GetPathName()
  if (-not $activePath) { throw 'Save the SolidWorks document before exporting.' }
  if ($Source) {
    $requested = Resolve-ProjectPath $Source -MustExist
    if (-not $requested.Equals($activePath,[StringComparison]::OrdinalIgnoreCase)) { throw 'Source must be the active SolidWorks document.' }
  }
  $Source = $activePath
  $openDocument = $solidworks.GetFirstDocument()
  while ($null -ne $openDocument) {
    $openPath = $openDocument.GetPathName()
    if ($openPath -and $openPath.StartsWith($projectPrefix,[StringComparison]::OrdinalIgnoreCase) -and $openDocument.GetSaveFlag()) { throw ('Save your open CAD documents before exporting: ' + $openPath) }
    $openDocument = $openDocument.GetNext()
  }
  $Configuration = $document.ConfigurationManager.ActiveConfiguration.Name
}
if (-not $Source) { throw 'Source is required with -RegisterOnly.' }
$sourceAbsolute = Resolve-ProjectPath $Source -MustExist
if (@('.sldasm','.sldprt') -notcontains [IO.Path]::GetExtension($sourceAbsolute).ToLowerInvariant()) { throw 'Source must be a SLDASM or SLDPRT document.' }
$sourceRelative = Relative-ProjectPath $sourceAbsolute
if (-not $Preview) {
  if ($RegisterOnly) { throw 'Preview is required with -RegisterOnly.' }
  $nameHash = [Security.Cryptography.SHA256]::Create()
  try { $id = [BitConverter]::ToString($nameHash.ComputeHash($utf8.GetBytes($sourceRelative))).Replace('-','').ToLowerInvariant().Substring(0,20) } finally { $nameHash.Dispose() }
  $Preview = '.gitpolar/previews/' + $id + '.step'
}
$previewAbsolute = Resolve-ProjectPath $Preview
if (@('.step','.stp','.stl') -notcontains [IO.Path]::GetExtension($previewAbsolute).ToLowerInvariant()) { throw 'Preview must be STEP, STP or STL.' }
if (-not $RegisterOnly -and [IO.Path]::GetExtension($previewAbsolute).ToLowerInvariant() -eq '.stl') { throw 'Automatic SolidWorks export uses STEP to retain assembly bodies. For a manually exported STL use -RegisterOnly.' }
$before = Get-ProjectFingerprint
if (-not $RegisterOnly) {
  [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($previewAbsolute))
  [void]$document.ClearSelection2($true)
  $exportErrors = 0
  $exportWarnings = 0
  # swSaveAsCurrentVersion = 0; swSaveAsOptions_Silent = 1.
  $saved = $document.Extension.SaveAs($previewAbsolute,0,1,$null,[ref]$exportErrors,[ref]$exportWarnings)
  if (-not $saved -or $exportErrors -ne 0 -or -not [IO.File]::Exists($previewAbsolute)) { throw ('SolidWorks export failed. Error flags: ' + $exportErrors) }
  if ($exportWarnings -ne 0) { Write-Warning ('SolidWorks export warning flags: ' + $exportWarnings + '. Check the exported model.') }
}
if (-not [IO.File]::Exists($previewAbsolute)) { throw 'Preview export does not exist.' }
$after = Get-ProjectFingerprint
if ($before -ne $after) { throw 'CAD source files changed during preview generation. Save all files and regenerate.' }
$previewRelative = Relative-ProjectPath $previewAbsolute
$manifestPath = Join-Path $projectRoot '.gitpolar/previews.json'
$records = @()
$manifestVersion = 1
if ([IO.File]::Exists($manifestPath)) {
  $old = [IO.File]::ReadAllText($manifestPath,$utf8) | ConvertFrom-Json
  if (@(1,2) -notcontains $old.version) { throw 'Unsupported preview manifest version.' }
  $manifestVersion = $old.version
  $records = @($old.previews | Where-Object { $_.source -ne $sourceRelative })
}
$records += [ordered]@{ source=$sourceRelative; path=$previewRelative; projectFingerprint=$after; previewOid=(Git-BlobId $previewRelative); configuration=$Configuration; generatedAt=[DateTime]::UtcNow.ToString('o') }
[void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($manifestPath))
$manifest = [ordered]@{ version=$manifestVersion; previews=@($records) } | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText($manifestPath,$manifest + [char]10,$utf8)
Write-Host ('Preview registered: ' + $sourceRelative + ' -> ' + $previewRelative)
Write-Host 'Commit and push the CAD source files, preview export, and .gitpolar/previews.json together.'
