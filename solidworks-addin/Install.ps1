[CmdletBinding()]
param([string]$Server,[string]$Workspace,[string]$Repository,[switch]$LoadNow)
$ErrorActionPreference='Stop'
$guid='{706C4152-8459-45E2-96DB-778DD8142F61}'
$dll=Join-Path $PSScriptRoot 'Gitpolar.SolidWorks.dll'
if(-not (Test-Path -LiteralPath $dll)){$dll=Join-Path $PSScriptRoot 'bin-native\Gitpolar.SolidWorks.dll'}
if(-not (Test-Path -LiteralPath $dll)){throw 'Run Build.ps1 first, or use the compiled plugin ZIP.'}
# Reuse the interop assemblies installed with the target user's SolidWorks.
$classId=(Get-ItemProperty -LiteralPath 'Registry::HKEY_CLASSES_ROOT\SldWorks.Application\CLSID').'(default)'
$command=(Get-ItemProperty -LiteralPath ('Registry::HKEY_CLASSES_ROOT\CLSID\'+$classId+'\LocalServer32')).'(default)'
$executable=if($command -match '^"([^"]+)"'){$matches[1]}elseif($command -match '^(.*?\.exe)'){$matches[1]}else{throw 'Cannot locate SolidWorks.'}
$interop=Join-Path ([IO.Path]::GetDirectoryName($executable)) 'api\redist'
foreach($name in @('SolidWorks.Interop.sldworks.dll','SolidWorks.Interop.swpublished.dll')){Copy-Item -LiteralPath (Join-Path $interop $name) -Destination (Join-Path (Split-Path $dll -Parent) $name) -Force}
$regasm=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe'
$regFile=Join-Path $env:TEMP ('gitpolar-com-'+[guid]::NewGuid().ToString('N')+'.reg')
& $regasm $dll /nologo /codebase ('/regfile:'+$regFile)
if($LASTEXITCODE -ne 0){throw 'Cannot generate COM registration.'}
$content=[IO.File]::ReadAllText($regFile).Replace('HKEY_CLASSES_ROOT','HKEY_CURRENT_USER\Software\Classes')
[IO.File]::WriteAllText($regFile,$content,[Text.Encoding]::Unicode)
& reg.exe import $regFile | Out-Null
if($LASTEXITCODE -ne 0){throw 'Per-user COM registration failed.'}
Remove-Item -LiteralPath $regFile
$elevated=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$addinRoot=if($elevated){'HKLM:\SOFTWARE\SolidWorks\Addins\'+$guid}else{'HKCU:\SOFTWARE\SolidWorks\Addins\'+$guid}
New-Item -Path $addinRoot -Force | Out-Null
New-ItemProperty -Path $addinRoot -Name '(default)' -Value 0 -PropertyType DWord -Force | Out-Null
New-ItemProperty -Path $addinRoot -Name Title -Value 'gitpolar Git Graph' -PropertyType String -Force | Out-Null
New-ItemProperty -Path $addinRoot -Name Description -Value 'Git history, branches and CAD previews for gitpolar' -PropertyType String -Force | Out-Null
$startup='HKCU:\Software\SolidWorks\AddInsStartup\'+$guid
New-Item -Path $startup -Force | Out-Null
New-ItemProperty -Path $startup -Name '(default)' -Value 1 -PropertyType DWord -Force | Out-Null
if($Server -or $Workspace -or $Repository){
  $settingsDirectory=Join-Path $env:LOCALAPPDATA 'gitpolar\solidworks'
  New-Item -ItemType Directory -Path $settingsDirectory -Force | Out-Null
  $settingsPath=Join-Path $settingsDirectory 'settings.json'
  $settings=if(Test-Path -LiteralPath $settingsPath){Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json}else{[pscustomobject]@{Server='http://localhost:4317';Workspace='';Repository=''}}
  if($Server){$uri=[Uri]$Server;if($uri.Scheme -notin @('http','https') -or $uri.UserInfo){throw 'Invalid server origin.'};$settings.Server=$uri.GetLeftPart([UriPartial]::Authority)}
  if($Workspace){$settings.Workspace=[IO.Path]::GetFullPath($Workspace)}
  if($Repository){$settings.Repository=$Repository}
  [IO.File]::WriteAllText($settingsPath,($settings|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
}
if($LoadNow){
  try{$sw=[Runtime.InteropServices.Marshal]::GetActiveObject('SldWorks.Application')}catch{throw 'Open SolidWorks before using -LoadNow.'}
  $interopAssembly=Join-Path (Split-Path $dll -Parent) 'SolidWorks.Interop.sldworks.dll'
  Add-Type -Path $interopAssembly
  Add-Type -ReferencedAssemblies $interopAssembly -TypeDefinition 'public static class GitpolarLoader { public static int Load(object app, string file) { return ((SolidWorks.Interop.sldworks.ISldWorks)app).LoadAddIn(file); } }'
  $result=[GitpolarLoader]::Load($sw,$dll)
  Write-Output ('SolidWorks LoadAddIn result: '+$result)
}
Write-Output ('Installed for current user: '+$dll)
if(-not $elevated){Write-Output 'To register in the automatic SolidWorks Add-ins list for all installations, rerun this installer once as Administrator. Current-session loading is available with -LoadNow.'}
