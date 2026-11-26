[CmdletBinding()]
param([switch]$UnloadNow)
$ErrorActionPreference='Stop'
$guid='{706C4152-8459-45E2-96DB-778DD8142F61}'
if($UnloadNow){try{$sw=[Runtime.InteropServices.Marshal]::GetActiveObject('SldWorks.Application');[void]$sw.UnloadAddIn('Gitpolar.SolidWorks.Addin')}catch{Write-Warning $_.Exception.Message}}
$targets=@('HKCU:\Software\Classes\CLSID\'+$guid,'HKCU:\Software\Classes\Gitpolar.SolidWorks.Addin','HKCU:\Software\SolidWorks\Addins\'+$guid,'HKCU:\Software\SolidWorks\AddInsStartup\'+$guid)
if(([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){$targets+=('HKLM:\SOFTWARE\SolidWorks\Addins\'+$guid)}
foreach($target in $targets){if(Test-Path -LiteralPath $target){Remove-Item -LiteralPath $target -Recurse -Force}}
Write-Output 'gitpolar COM and SolidWorks add-in registrations removed. CAD, history worktrees and settings are preserved.'
