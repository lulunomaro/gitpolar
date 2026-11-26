[CmdletBinding()]
param([string]$InteropDirectory,[string]$OutputDirectory)
$ErrorActionPreference='Stop'
if(-not $OutputDirectory){$OutputDirectory=Join-Path $PSScriptRoot 'bin-native'}
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(-not (Test-Path -LiteralPath $compiler)){throw '.NET Framework 4.8 is required.'}
if(-not $InteropDirectory){
  $classId=(Get-ItemProperty -LiteralPath 'Registry::HKEY_CLASSES_ROOT\SldWorks.Application\CLSID').'(default)'
  $command=(Get-ItemProperty -LiteralPath ('Registry::HKEY_CLASSES_ROOT\CLSID\'+$classId+'\LocalServer32')).'(default)'
  $executable=if($command -match '^"([^"]+)"'){$matches[1]}elseif($command -match '^(.*?\.exe)'){$matches[1]}else{throw 'Cannot locate SolidWorks.'}
  $InteropDirectory=Join-Path ([IO.Path]::GetDirectoryName($executable)) 'api\redist'
}
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$references=@('System.dll','System.Core.dll','System.Drawing.dll','System.Windows.Forms.dll','System.Web.Extensions.dll')
foreach($name in @('SolidWorks.Interop.sldworks.dll','SolidWorks.Interop.swpublished.dll')){
  $source=Join-Path $InteropDirectory $name
  if(-not (Test-Path -LiteralPath $source)){throw ('Missing SolidWorks interop: '+$source)}
  $references+=$source
  Copy-Item -LiteralPath $source -Destination (Join-Path $OutputDirectory $name) -Force
}
$arguments=@('/nologo','/target:library','/platform:x64','/optimize+','/utf8output',('/out:'+(Join-Path $OutputDirectory 'Gitpolar.SolidWorks.dll')))
$arguments+=('/resource:'+(Join-Path $PSScriptRoot 'assets\codicon.ttf')+',Gitpolar.Codicons.ttf')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'assets\codicons-LICENSE.txt') -Destination (Join-Path $OutputDirectory 'codicons-LICENSE.txt') -Force
$arguments+=$references | ForEach-Object {'/reference:'+$_}
$arguments+=Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.cs' | ForEach-Object FullName
& $compiler $arguments
if($LASTEXITCODE -ne 0){throw 'Native gitpolar add-in compilation failed.'}
Add-Type -AssemblyName System.Drawing
$logo=Join-Path (Split-Path $PSScriptRoot -Parent) 'assets\gitpolar-logo.png'
$image=[Drawing.Image]::FromFile($logo)
try{foreach($size in @(20,32,40,64,96,128)){$bitmap=New-Object Drawing.Bitmap $size,$size;$graphics=[Drawing.Graphics]::FromImage($bitmap);try{$graphics.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic;$graphics.DrawImage($image,0,0,$size,$size);$bitmap.Save((Join-Path $OutputDirectory ('icon-'+$size+'.png')),[Drawing.Imaging.ImageFormat]::Png)}finally{$graphics.Dispose();$bitmap.Dispose()}}}finally{$image.Dispose()}
# Each command has its own icon in every SolidWorks-supported toolbar size.
foreach($name in @('SolidWorks.Interop.sldworks.dll','SolidWorks.Interop.swpublished.dll')){[void][Reflection.Assembly]::LoadFrom((Join-Path $OutputDirectory $name))}
$taskAssembly=[Reflection.Assembly]::LoadFrom((Join-Path $OutputDirectory 'Gitpolar.SolidWorks.dll'))
$taskDraw=$taskAssembly.GetType('Gitpolar.SolidWorks.CodeIcons').GetMethod('Draw',[Reflection.BindingFlags]'Public,Static')
$taskGlyphs=@('save','graph','source-control','settings-gear','git-branch','sync','cloud-upload')
foreach($size in @(20,32,40,64,96,128)){
  $taskStrip=New-Object Drawing.Bitmap ($size*7),$size
  $taskGraphics=[Drawing.Graphics]::FromImage($taskStrip)
  try{
    $taskGraphics.Clear([Drawing.Color]::Transparent)
    for($i=0;$i -lt $taskGlyphs.Length;$i++){
      $taskBounds=New-Object Drawing.Rectangle ($i*$size),0,$size,$size
      $taskColor=if($i -eq 0){[Drawing.Color]::FromArgb(49,145,73)}elseif($i -eq 4){[Drawing.Color]::FromArgb(169,75,177)}else{[Drawing.Color]::FromArgb(54,126,177)}
      [void]$taskDraw.Invoke($null,[object[]]@($taskGraphics,$taskGlyphs[$i],$taskBounds,$taskColor,[int][Math]::Round($size*.78)))
    }
    $taskStrip.Save((Join-Path $OutputDirectory ('commands-'+$size+'.png')),[Drawing.Imaging.ImageFormat]::Png)
  }finally{$taskGraphics.Dispose();$taskStrip.Dispose()}
}
$tools=Join-Path $OutputDirectory 'tools'
New-Item -ItemType Directory -Path $tools -Force | Out-Null
foreach($name in @('Export-SolidWorksProject.ps1','Export-SolidWorksPreview.ps1')){Copy-Item -LiteralPath (Join-Path (Split-Path $PSScriptRoot -Parent) ('tools\'+$name)) -Destination (Join-Path $tools $name) -Force}
foreach($name in @('Install.ps1','Uninstall.ps1','README.md')){Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path $OutputDirectory $name) -Force}
Copy-Item -LiteralPath (Join-Path (Split-Path $PSScriptRoot -Parent) 'THIRD_PARTY_NOTICES.md') -Destination (Join-Path $OutputDirectory 'THIRD_PARTY_NOTICES.md') -Force
Write-Output ('Built native add-in: '+(Join-Path $OutputDirectory 'Gitpolar.SolidWorks.dll'))
