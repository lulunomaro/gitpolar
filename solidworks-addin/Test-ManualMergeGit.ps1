[CmdletBinding()]
param([string]$AssemblyDirectory)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
if(-not $AssemblyDirectory){$AssemblyDirectory=Join-Path $PSScriptRoot 'bin-native'}
foreach($name in @('SolidWorks.Interop.sldworks.dll','SolidWorks.Interop.swpublished.dll','Gitpolar.SolidWorks.dll')){[void][Reflection.Assembly]::LoadFrom((Join-Path $AssemblyDirectory $name))}
$fixture=Join-Path $env:TEMP ('gitpolar-manual-git-'+[guid]::NewGuid().ToString('N'));[void](New-Item -ItemType Directory -Path $fixture)
function G([string[]]$arguments){[Gitpolar.SolidWorks.Git]::Run($fixture,$arguments)}
function Action([string]$name,[hashtable]$values=@{}){$dictionary=New-Object 'System.Collections.Generic.Dictionary[string,object]';foreach($key in $values.Keys){$dictionary.Add($key,$values[$key])};[Gitpolar.SolidWorks.RepositoryGit]::Execute($fixture,$name,$dictionary).GetAwaiter().GetResult()}
function Check([bool]$value,[string]$message){if(-not $value){throw $message}}
function Refused([scriptblock]$body,[string]$message){$failed=$false;try{[void](& $body)}catch{$failed=$true};Check $failed $message}
function Commit([string]$message){[void](G @('add','.'));[void](G @('commit','-m',$message))}
[void](G @('init','--initial-branch=main'));[void](G @('config','user.name','Manual CAD Test'));[void](G @('config','user.email','manual@test.invalid'))
[IO.File]::WriteAllText((Join-Path $fixture '.gitattributes'),'*.SLDPRT binary');[IO.File]::WriteAllBytes((Join-Path $fixture '零件.SLDPRT'),[byte[]](0,1,255));[IO.File]::WriteAllText((Join-Path $fixture '说明.txt'),'base');Commit 'base'
[void](Action 'create-branch' @{name='codex/clean';switch=$true});[IO.File]::WriteAllText((Join-Path $fixture 'incoming.txt'),'new');Commit 'clean branch';$clean=(G @('rev-parse','HEAD')).Trim();[void](Action 'checkout' @{reference='refs/heads/main'});$before=(G @('rev-parse','HEAD')).Trim();[void](Action 'merge-manual' @{reference='refs/heads/codex/clean'})
Check ([Gitpolar.SolidWorks.RepositoryGit]::Merging($fixture)) 'A clean manual merge did not pause.';Check ((G @('rev-parse','HEAD')).Trim() -eq $before) 'Manual merge committed before confirmation.';Refused {Action 'continue-merge'} 'A manual merge without an applied assembly result was completed.'
[void](Action 'abort-merge');Check (-not [Gitpolar.SolidWorks.RepositoryGit]::Merging($fixture)) 'Abort left MERGE_HEAD.'
[void](Action 'create-branch' @{name='codex/binary';switch=$true});[IO.File]::WriteAllBytes((Join-Path $fixture '零件.SLDPRT'),[byte[]](0,6,255));[IO.File]::WriteAllText((Join-Path $fixture '说明.txt'),'theirs');Commit 'incoming binary';$theirs=(G @('rev-parse','HEAD')).Trim();[void](Action 'checkout' @{reference='refs/heads/main'});[IO.File]::WriteAllBytes((Join-Path $fixture '零件.SLDPRT'),[byte[]](0,4,255));[IO.File]::WriteAllText((Join-Path $fixture '说明.txt'),'ours');Commit 'ours binary';$ours=(G @('rev-parse','HEAD')).Trim();[void](Action 'merge-manual' @{reference='refs/heads/codex/binary'})
Check (([Gitpolar.SolidWorks.RepositoryGit]::Conflicts($fixture)).Count -eq 2) 'Expected two conflicts.';[IO.File]::WriteAllBytes((Join-Path $fixture '零件.SLDPRT'),[byte[]](0,5,255))
Refused {Action 'mark-manual-resolved' @{path='零件.SLDPRT';confirmed=$false}} 'Unconfirmed manual result was staged.';Check (([Gitpolar.SolidWorks.RepositoryGit]::Conflicts($fixture)).Count -eq 2) 'Unconfirmed action changed conflict stages.'
[void](Action 'mark-manual-resolved' @{path='零件.SLDPRT';confirmed=$true});Check (([Gitpolar.SolidWorks.RepositoryGit]::Conflicts($fixture)).Count -eq 1) 'Manual staging included unrelated conflicts.';Refused {Action 'mark-manual-resolved' @{path='说明.txt';confirmed=$true}} 'Text conflict markers were accepted.';[void](Action 'resolve-conflict' @{path='说明.txt';side='ours'})
$session=[Gitpolar.SolidWorks.CadMergeStore]::Load($fixture);[Gitpolar.SolidWorks.CadMergeStore]::Validate($fixture,$session);$session.Theirs=$ours;Refused {[Gitpolar.SolidWorks.CadMergeStore]::Validate($fixture,$session)} 'Stale commit pair was accepted.';$session.Theirs=$theirs;$session.State='applied';$output=New-Object Gitpolar.SolidWorks.CadMergeOutput;$output.Target='零件.SLDPRT';$output.Hash=[Gitpolar.SolidWorks.CadMergeStore]::Hash((Join-Path $fixture $output.Target));$session.Applied.Add($output);[Gitpolar.SolidWorks.CadMergeStore]::Save($fixture,$session)
$held=[IO.File]::Open((Join-Path $fixture '零件.SLDPRT'),[IO.FileMode]::Open,[IO.FileAccess]::ReadWrite,[IO.FileShare]::ReadWrite);try{Check ([Gitpolar.SolidWorks.CadMergeStore]::Hash((Join-Path $fixture '零件.SLDPRT')).Length -eq 64) 'An open CAD file could not be fingerprinted.'}finally{$held.Dispose()}
[IO.File]::WriteAllBytes((Join-Path $fixture '零件.SLDPRT'),[byte[]](0,7,255));Refused {Action 'continue-merge'} 'A result changed after approval was committed.';[void](G @('add','零件.SLDPRT'));$session.Applied[0].Hash=[Gitpolar.SolidWorks.CadMergeStore]::Hash((Join-Path $fixture '零件.SLDPRT'));[Gitpolar.SolidWorks.CadMergeStore]::Save($fixture,$session);[void](Action 'continue-merge');$parents=(G @('show','-s','--format=%P')).Trim().Split(' ')
Check ($parents.Count -eq 2 -and $parents[0] -eq $ours -and $parents[1] -eq $theirs) 'Final merge does not retain the exact two parents.';Check (([Gitpolar.SolidWorks.CadMergeStore]::Load($fixture)).State -eq 'completed') 'Manual session did not complete.'
$drawing='Plate[1].SLDPRT';$similar='Plate1.SLDPRT'
foreach($path in @($drawing,$similar)){[IO.File]::WriteAllBytes((Join-Path $fixture $path),[byte[]](0,1))}
Commit 'Similar drawing names'
[void](Action 'create-branch' @{name='codex/replace-drawing';switch=$true})
[void](G @('--literal-pathspecs','rm','--',$drawing))
[IO.File]::WriteAllBytes((Join-Path $fixture $similar),[byte[]](0,2));Commit 'Delete one drawing and edit its neighbor'
[void](Action 'checkout' @{reference='refs/heads/main'})
foreach($path in @($drawing,$similar)){[IO.File]::WriteAllBytes((Join-Path $fixture $path),[byte[]](0,3))}
Commit 'Edit both drawings'
[void](Action 'merge' @{reference='refs/heads/codex/replace-drawing'})
[void](Action 'mark-manual-resolved' @{path=$drawing;confirmed=$true})
Check (([Gitpolar.SolidWorks.RepositoryGit]::Conflicts($fixture) -join ',') -ceq $similar) 'Marking a drawing resolved also staged its neighbor.'
[void](Action 'abort-merge')
[void](Action 'merge' @{reference='refs/heads/codex/replace-drawing'})
[void](Action 'resolve-conflict' @{path=$drawing;side='theirs'})
Check (-not [IO.File]::Exists((Join-Path $fixture $drawing))) 'The selected deletion was not applied.'
Check (([Gitpolar.SolidWorks.RepositoryGit]::Conflicts($fixture) -join ',') -ceq $similar) 'Resolving one drawing changed the other conflict.'
[void](Action 'resolve-conflict' @{path=$similar;side='ours'})
[void](Action 'continue-merge')
[pscustomobject]@{ok=$true;cleanMergePaused=$true;explicitConfirmation=$true;onlySelectedConflictStaged=$true;textMarkersRefused=$true;stalePairRefused=$true;changedResultRefused=$true;exactTwoParents=$true;fixture=$fixture}|ConvertTo-Json -Compress
