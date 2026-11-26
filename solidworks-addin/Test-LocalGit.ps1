[CmdletBinding()]
param([string]$AssemblyDirectory)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Web.Extensions
if(-not $AssemblyDirectory){$AssemblyDirectory=Join-Path $PSScriptRoot 'bin-native'}
foreach($name in @('SolidWorks.Interop.sldworks.dll','SolidWorks.Interop.swpublished.dll','Gitpolar.SolidWorks.dll')){[void][Reflection.Assembly]::LoadFrom((Join-Path $AssemblyDirectory $name))}
$fixture=Join-Path $env:TEMP ('gitpolar-native-test-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $fixture | Out-Null
function Git([string[]]$Arguments){[Gitpolar.SolidWorks.Git]::Run($fixture,$Arguments)}
[void](Git @('init','--initial-branch=main'))
[void](Git @('config','user.name','Native Test'))
[void](Git @('config','user.email','native@test.invalid'))
$unicode=[string][char]0x7535+[string][char]0x6C60+'[1].SLDPRT'
[IO.File]::WriteAllText((Join-Path $fixture $unicode),'fixture-not-real-cad')
[void](Git @('add','--',$unicode))
$message='quoted "text" '+[string][char]0x7535+' $(no-shell)'
[void](Git @('commit','-m',$message))
$oid=(Git @('rev-parse','HEAD')).Trim()
[void](Git @('branch','design/plate'))
[void](Git @('switch','--','design/plate'))
[void](Git @('commit','--allow-empty','-m','Design revision'))
[void](Git @('switch','--','main'))
[void](Git @('commit','--allow-empty','-m','Main revision'))
[void](Git @('merge','--no-ff','design/plate','-m','Merge revision'))
$binary=New-Object byte[] 4096
for($i=0;$i -lt $binary.Length;$i++){$binary[$i]=[byte]($i % 256)}
$binaryPath=Join-Path $fixture 'binary.dat'
[IO.File]::WriteAllBytes($binaryPath,$binary)
[void](Git @('add','binary.dat'))
[void](Git @('commit','-m','Binary fixture'))
$blob=(Git @('rev-parse','HEAD:binary.dat')).Trim()
$exported=Join-Path $fixture 'binary-export.dat'
[void][Gitpolar.SolidWorks.Git]::BinaryFileAsync($fixture,[string[]]@('cat-file','blob',$blob),$exported,$null).GetAwaiter().GetResult()
if((Get-FileHash -LiteralPath $exported).Hash -ne (Get-FileHash -LiteralPath $binaryPath).Hash){throw 'Historical binary stream was corrupted.'}
$serializer=New-Object Web.Script.Serialization.JavaScriptSerializer
$graph=[Gitpolar.SolidWorks.GitpolarPane]::Graph($fixture,'','')
$json=$serializer.Serialize($graph) | ConvertFrom-Json
if($json.commits.Count -ne 5 -or $json.commits[1].parents.Count -ne 2){throw 'Native graph topology failed.'}
$detail=$serializer.Serialize([Gitpolar.SolidWorks.GitpolarPane]::Details($fixture,$oid)) | ConvertFrom-Json
if($detail.message -ne $message -or $detail.files[0].path -ne $unicode){throw 'Unicode or Windows argument quoting failed.'}
$sentinel=Join-Path $fixture 'never-created'
$payload=@('-e','console.log(JSON.stringify(process.argv.slice(1)))','--','C:\trailing\','a "b"\','$(test); echo secret',$unicode)
$echo=[Gitpolar.SolidWorks.Git]::ProcessAsync('node.exe',$fixture,$payload).GetAwaiter().GetResult() | ConvertFrom-Json
if(($echo | ConvertTo-Json -Compress) -ne ($payload[3..6] | ConvertTo-Json -Compress)){throw 'Argument round trip failed.'}
try{[void][Gitpolar.SolidWorks.GitpolarPane]::SafePath($fixture,'../outside.sldprt');throw 'Traversal accepted'}catch{if($_.Exception.Message -eq 'Traversal accepted'){throw}}
[IO.File]::AppendAllText((Join-Path $fixture $unicode),'changed')
$changed=$serializer.Serialize([Gitpolar.SolidWorks.GitpolarPane]::ChangedFiles($fixture)) | ConvertFrom-Json
if($changed[0].path -ne $unicode){throw 'Changed-file decoding failed.'}
$pane=[Gitpolar.SolidWorks.GitpolarPane]::new($null)
function Save-Selection([string[]]$Paths) {
  $values=New-Object 'System.Collections.Generic.Dictionary[string,object]'
  $values.Add('message','Save selected drawings')
  $values.Add('files',$Paths)
  [void]$pane.Dispatch('commit',$values,$fixture).GetAwaiter().GetResult()
}
$similar=$unicode.Replace('[1]','1')
[IO.File]::WriteAllText((Join-Path $fixture $similar),'similar part')
[void](Git @('--literal-pathspecs','add','--',$similar))
[void](Git @('commit','--only','-m','Similar part','--',$similar))
[IO.File]::AppendAllText((Join-Path $fixture $similar),'unselected edit')
[void](Git @('add','--','binary-export.dat'))
Save-Selection @($unicode)
$paths=Git @('diff-tree','--no-commit-id','--name-only','-r','-z','HEAD')
if($paths -cne ($unicode+[char]0)){throw 'Saving one drawing also committed a similarly named part.'}
$renamed='Renamed [2].SLDPRT'
[void](Git @('mv','--',$unicode,$renamed))
Save-Selection @($renamed)
if((Git @('ls-tree','--name-only','-z','HEAD','--',$renamed)) -cne ($renamed+[char]0) -or (Git @('ls-tree','--name-only','HEAD','--',$unicode))){throw 'Staged drawing rename was not committed.'}
[void](Git @('--literal-pathspecs','rm','--',$renamed))
Save-Selection @($renamed)
if(Git @('ls-tree','--name-only','HEAD','--',$renamed)){throw 'Staged drawing deletion was not committed.'}
$many=@(foreach($i in 1..330){
  $name='part-'+$i.ToString('D4')+'-'+('a'*90)+'.SLDPRT'
  [IO.File]::WriteAllText((Join-Path $fixture $name),'new part')
  $name
})
Save-Selection $many
$added=Git @('diff-tree','--no-commit-id','--name-only','-r','-z','HEAD')
if($added -cne (($many -join [char]0)+[char]0)){throw 'Large assembly selection did not match the committed paths.'}
if((Git @('diff','--cached','--name-only','-z')) -cne ('binary-export.dat'+[char]0)){throw 'Unselected staging changed.'}
[pscustomobject]@{ok=$true;commits=$json.commits.Count;mergeParents=$json.commits[1].parents.Count;unicode=$true;argumentRoundtrip=$true;pathBoundary=$true;fixture=$fixture}|ConvertTo-Json -Compress
