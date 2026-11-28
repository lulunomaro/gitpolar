[CmdletBinding()]
param([string]$AssemblyDirectory = (Join-Path $PSScriptRoot 'bin-native'))
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
foreach ($name in 'SolidWorks.Interop.sldworks.dll','SolidWorks.Interop.swpublished.dll','Gitpolar.SolidWorks.dll') {
  [void][Reflection.Assembly]::LoadFrom((Join-Path $AssemblyDirectory $name))
}
$root = Join-Path $env:TEMP ('gitpolar-merge-integrity-' + [Guid]::NewGuid().ToString('N'))
$failures = New-Object 'System.Collections.Generic.List[string]'
$passed = New-Object 'System.Collections.Generic.List[string]'
function G([string[]]$argv) { [Gitpolar.SolidWorks.Git]::Run($work, $argv) }
function Action([string]$name, [hashtable]$options = @{}) {
  $values = New-Object 'System.Collections.Generic.Dictionary[string,object]'
  foreach ($key in $options.Keys) { $values.Add($key, $options[$key]) }
  [Gitpolar.SolidWorks.RepositoryGit]::Execute($work, $name, $values).GetAwaiter().GetResult()
}
function WriteFile([string]$path, [string]$text) {
  $file = Join-Path $work $path
  [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($file))
  [IO.File]::WriteAllText($file, $text)
}
function Commit([string]$message) {
  [void](G @('add','-A')); [void](G @('commit','-m',$message))
}
function Check([bool]$condition, [string]$message) { if (-not $condition) { throw $message } }
function Rejected([scriptblock]$attempt) {
  try { [void](& $attempt); return $false } catch { return $true }
}
function Case([string]$name, [scriptblock]$body) {
  $work = Join-Path $root $name
  try {
    [void][IO.Directory]::CreateDirectory($work)
    [void](G @('init','--initial-branch=main'))
    [void](G @('config','user.name','Gitpolar fixture')); [void](G @('config','user.email','fixture@test.invalid'))
    [void](G @('config','core.autocrlf','false'))
    WriteFile 'Assembly.SLDASM' 'base assembly'; Commit 'base'
    [void](& $body); $passed.Add($name)
  } catch { $failures.Add("$name -- $($_.Exception.Message)") }
}
function Diverge([bool]$conflict = $false) {
  [void](G @('switch','-c','incoming'))
  WriteFile 'revision.txt' 'incoming'; Commit 'incoming change'
  [void](G @('switch','main'))
  if ($conflict) { WriteFile 'revision.txt' 'ours' } else { WriteFile 'ours.txt' 'ours' }; Commit 'ours change'
}
# This is the boundary after Pack and Go has exported files. Only the CAD producer is substituted.
function RecordApplied([string[]]$paths) {
  $session = [Gitpolar.SolidWorks.CadMergeStore]::Load($work)
  $session.State = 'applied'; $session.Target = 'Assembly.SLDASM'
  foreach ($path in $paths) {
    $file = New-Object Gitpolar.SolidWorks.CadMergeOutput
    $file.Target = $path; $file.Hash = [Gitpolar.SolidWorks.CadMergeStore]::Hash((Join-Path $work $path))
    $session.Applied.Add($file)
  }
  [Gitpolar.SolidWorks.CadMergeStore]::Save($work, $session)
}
foreach ($damage in 'unstaged-dependency','wrong-index-blob') {
  Case $damage {
    $part = 'parts/轮 [1].SLDPRT'
    WriteFile '.gitattributes' '*.SLDPRT filter=lfs diff=lfs merge=lfs -text'
    [void](G @('config','filter.lfs.process','git-lfs filter-process')); [void](G @('config','filter.lfs.required','true'))
    Commit 'use LFS'; Diverge
    $ours = (G @('rev-parse','HEAD')).Trim(); $theirs = (G @('rev-parse','refs/heads/incoming')).Trim()
    [void](Action 'merge-manual' @{reference='refs/heads/incoming'})
    WriteFile 'Assembly.SLDASM' 'approved assembly'; WriteFile $part 'approved LFS payload'
    [void](G @('--literal-pathspecs','add','--','Assembly.SLDASM',$part)); RecordApplied @('Assembly.SLDASM',$part)
    $pointer = (G @('rev-parse',(':'+$part))).Trim()
    Check ((G @('cat-file','blob',$pointer)).StartsWith('version https://git-lfs.github.com/spec/v1')) 'Fixture did not stage a real LFS pointer.'
    if ($damage -eq 'unstaged-dependency') { [void](G @('reset','-q','HEAD','--',$part)) }
    else {
      $wrong = (G @('rev-parse','HEAD:Assembly.SLDASM')).Trim()
      [void](G @('update-index','--cacheinfo',"100644,$wrong,$part")); [void](G @('update-index','--assume-unchanged','--',$part))
    }
    Check (-not (G @('diff','--name-only'))) 'Fixture must have an unchanged tracked worktree according to git diff.'
    $rejected = Rejected { Action 'continue-merge' }
    $treeEntry = (G @('--literal-pathspecs','ls-tree','HEAD','--',$part)).Trim()
    Check ($rejected -and (G @('rev-parse','HEAD')).Trim() -eq $ours) "Committed without the approved dependency. Actual tree entry [$treeEntry], approved blob $pointer."
    if ($damage -eq 'wrong-index-blob') { [void](G @('update-index','--no-assume-unchanged','--',$part)) }
    [void](G @('--literal-pathspecs','add','--',$part)); [void](Action 'continue-merge')
    Check ((G @('show','-s','--format=%P')).Trim() -eq "$ours $theirs") 'Incorrect merge parents after repairing the index.'
    Check ((G @('rev-parse',('HEAD:'+$part))).Trim() -eq $pointer) 'Committed dependency differs from the reviewed LFS file.'
  }
}
Case 'stale-abort' {
  Diverge; [void](G @('branch','twin','HEAD'))
  [void](Action 'merge-manual' @{reference='refs/heads/incoming'})
  [void](G @('merge','--abort')); [void](G @('switch','twin'))
  [void](G @('merge','--no-ff','--no-commit','incoming'))
  WriteFile 'NewResult.SLDASM' 'work on twin'; [void](G @('add','NewResult.SLDASM'))
  $before = G @('ls-files','--stage','-z')
  $rejected = Rejected { Action 'abort-merge' }
  $merging = [Gitpolar.SolidWorks.RepositoryGit]::Merging($work); $kept = [IO.File]::Exists((Join-Path $work 'NewResult.SLDASM'))
  Check ($rejected -and $merging -and $kept) "A stale abort touched the twin merge. MERGE_HEAD present=$merging, new result exists=$kept."
  Check ((G @('ls-files','--stage','-z')) -ceq $before) 'Refused abort changed the index.'
}
Case 'stale-resolution' {
  Diverge $true; [void](G @('branch','twin','HEAD'))
  [void](Action 'merge-manual' @{reference='refs/heads/incoming'}); RecordApplied @('Assembly.SLDASM')
  [void](G @('merge','--abort')); [void](G @('switch','twin')); [void](Rejected { G @('merge','--no-ff','--no-commit','incoming') })
  $stages = G @('ls-files','--unmerged','-z'); WriteFile 'revision.txt' 'manual edit on twin'
  Check (Rejected { Action 'mark-manual-resolved' @{path='revision.txt';confirmed=$true} }) 'The old session marked a conflict on twin as resolved.'
  Check (Rejected { Action 'resolve-conflict' @{path='revision.txt';side='theirs'} }) 'The old session overwrote the manual edit on twin.'
  Check ((G @('ls-files','--unmerged','-z')) -ceq $stages) 'Stale resolution changed conflict stages.'
  [void](G @('add','revision.txt')); $before = (G @('rev-parse','HEAD')).Trim()
  Check (Rejected { Action 'continue-merge' }) 'The old approval committed on twin.'
  Check ((G @('rev-parse','HEAD')).Trim() -eq $before) 'Twin moved after stale approval.'
}
foreach ($operation in 'merge','merge-manual') {
  Case ('detached-'+$operation) {
    Diverge; [void](G @('switch','--detach','HEAD')); $before = (G @('rev-parse','HEAD')).Trim()
    $rejected = Rejected { Action $operation @{reference='refs/heads/incoming'} }
    $after = (G @('rev-parse','HEAD')).Trim(); $merging = [Gitpolar.SolidWorks.RepositoryGit]::Merging($work)
    Check ($rejected -and $after -eq $before -and -not $merging) "Detached operation changed the checkout. HEAD $before => $after, MERGE_HEAD present=$merging."
  }
}
Case 'detached-continue' {
  Diverge; [void](G @('switch','--detach','HEAD')); $before = (G @('rev-parse','HEAD')).Trim()
  [void](G @('merge','--no-commit','--no-ff','refs/heads/incoming'))
  Check (Rejected { Action 'continue-merge' }) 'A merge was committed without a destination branch.'
  Check ([Gitpolar.SolidWorks.RepositoryGit]::Merging($work) -and (G @('rev-parse','HEAD')).Trim() -eq $before) 'Refused completion moved detached HEAD.'
}
Case 'MERGE_HEAD-tag' {
  [void](G @('tag','MERGE_HEAD','HEAD'))
  Check (-not [Gitpolar.SolidWorks.RepositoryGit]::Merging($work)) 'A tag named MERGE_HEAD was reported as a merge in progress.'
}
Case 'branch-and-tag-names' {
  [void](G @('tag','main','HEAD')); [void](G @('tag','tags/main','HEAD'))
  $state = Action 'repository-state'
  Check ($state.current -ceq 'main') "Reported current branch [$($state.current)] instead of main."
  $tag = @($state.tags | Where-Object { $_.name -ceq 'main' })
  Check ($tag.Count -eq 1) 'The bare tag name was lost in the branch list.'
  [void](Action 'delete-tag' @{name=$tag[0].name})
  Check ((G @('show-ref','--verify','refs/tags/tags/main')).Length -gt 0) 'Deleting main deleted tags/main.'
}
Case 'commit-and-push-ref' {
  [void](G @('tag','main','HEAD')); $remote = Join-Path $root 'isolated-destination.git'
  [void](G @('init','--bare',$remote)); [void](G @('remote','add','origin',$remote))
  WriteFile 'Assembly.SLDASM' 'locally approved'
  $fields = New-Object 'System.Collections.Generic.Dictionary[string,object]'
  $fields.Add('message','save assembly'); $fields.Add('files',[string[]]@('Assembly.SLDASM')); $fields.Add('push',$true)
  $pane = [Gitpolar.SolidWorks.GitpolarPane]::new($null); [void]$pane.Dispatch('commit',$fields,$work).GetAwaiter().GetResult()
  $refs = [Gitpolar.SolidWorks.Git]::Run($remote,[string[]]@('for-each-ref','--format=%(refname) %(objectname)','refs/heads')).Trim()
  Check ($refs -ceq ('refs/heads/main '+(G @('rev-parse','HEAD')).Trim())) "Commit-and-push wrote unexpected refs to the isolated bare repository [$refs]."
}
Case 'tracking-ref' {
  Diverge; $oid = (G @('rev-parse','incoming')).Trim()
  [void](G @('remote','add','origin',(Join-Path $root 'unused-local-origin.git')))
  [void](G @('update-ref','refs/remotes/origin/review',$oid)); [void](G @('branch','origin/review','HEAD'))
  [void](Action 'checkout' @{reference='refs/remotes/origin/review'})
  Check ((G @('rev-parse','HEAD')).Trim() -eq $oid) 'Checked out the local origin/review branch instead of the selected remote-tracking ref.'
  [void](Action 'set-upstream' @{reference='refs/remotes/origin/review'})
  Check ((G @('rev-parse','--symbolic-full-name','@{u}')).Trim() -ceq 'refs/remotes/origin/review') 'Wrong upstream ref.'
}
Case 'unmerged-published-branch' {
  Diverge; $oid = (G @('rev-parse','incoming')).Trim()
  [void](G @('remote','add','origin',(Join-Path $root 'unused-local-origin.git')))
  [void](G @('update-ref','refs/remotes/origin/incoming',$oid)); [void](G @('branch','--set-upstream-to=refs/remotes/origin/incoming','incoming'))
  Check (Rejected { Action 'delete-branch' @{reference='refs/heads/incoming'} }) 'Deleted a local branch with changes not merged into the current branch.'
  Check ((G @('rev-parse','refs/heads/incoming')).Trim() -eq $oid) 'Unmerged local branch moved.'
}
Case 'CAD-text-conflict' {
  WriteFile '.gitattributes' '*.SLDPRT text conflict-marker-size=4'; WriteFile 'Pointer.SLDPRT' 'base'; Commit 'base part'
  [void](G @('switch','-c','incoming')); WriteFile 'Pointer.SLDPRT' 'incoming'; Commit 'incoming part'
  [void](G @('switch','main')); WriteFile 'Pointer.SLDPRT' 'ours'; Commit 'ours part'
  [void](Action 'merge' @{reference='refs/heads/incoming'}); $stages = G @('ls-files','--unmerged','-z')
  Check ([IO.File]::ReadAllText((Join-Path $work 'Pointer.SLDPRT')).StartsWith('<<<< HEAD')) 'Expected a real custom-sized Git conflict block.'
  Check (Rejected { Action 'mark-manual-resolved' @{path='Pointer.SLDPRT';confirmed=$true} }) 'CAD filename bypassed the conflict-marker check.'
  Check ((G @('ls-files','--unmerged','-z')) -ceq $stages) 'Unresolved CAD text was staged.'
}
Case 'resolved-markdown' {
  Diverge $true; [void](Action 'merge' @{reference='refs/heads/incoming'}); WriteFile 'revision.txt' "Drawing revisions`n=================`nResolved."
  [void](Action 'mark-manual-resolved' @{path='revision.txt';confirmed=$true}); [void](Action 'continue-merge')
  Check ((G @('show','HEAD:revision.txt')).Contains('Resolved.')) 'Saved text was not committed.'
}
Case 'same-name-dependency' {
  $paths = 'Gear.SLDPRT','parts/Gear.SLDPRT'; foreach ($path in $paths) { WriteFile $path $path }; Commit 'two gears'
  $session = New-Object Gitpolar.SolidWorks.CadMergeSession; $session.Workspace = $work
  foreach ($path in $paths) { $file = New-Object Gitpolar.SolidWorks.CadMergeFile; $file.Side = 'ours'; $file.Relative = $path; $session.Files.Add($file) }
  $find = [Gitpolar.SolidWorks.GitpolarPane].GetMethod('FindSource',[Reflection.BindingFlags]'Static, NonPublic')
  $snapshot = [string](Join-Path $root 'snapshot'); $part = $find.Invoke($null, @($session.PSObject.BaseObject, 'ours', 'parts\Gear.SLDPRT', $snapshot.PSObject.BaseObject))
  Check ($part.Relative -ceq $paths[1]) "Selected $($part.Relative) for a saved relative reference to $($paths[1])."
  Check (Rejected { $find.Invoke($null, @($session.PSObject.BaseObject, 'ours', ([string](Join-Path $work 'removed\Gear.SLDPRT')).PSObject.BaseObject, $snapshot.PSObject.BaseObject)) }) 'Guessed a replacement for a missing repo-relative reference.'
}
Case 'restarted-merge' {
  Diverge; [void](Action 'merge-manual' @{reference='refs/heads/incoming'}); RecordApplied @('Assembly.SLDASM')
  [void](G @('merge','--abort')); [void](G @('merge','--no-ff','--no-commit','incoming'))
  $before = (G @('rev-parse','HEAD')).Trim()
  Check (Rejected { Action 'continue-merge' }) 'An old approval committed a newly started merge of the same branch and parents.'
  Check ([Gitpolar.SolidWorks.RepositoryGit]::Merging($work) -and (G @('rev-parse','HEAD')).Trim() -eq $before) 'The restarted merge changed.'
}
Case 'legacy-session' {
  Diverge; [void](Action 'merge-manual' @{reference='refs/heads/incoming'}); RecordApplied @('Assembly.SLDASM')
  $json = (G @('rev-parse','--git-path','gitpolar-cad-merge.json')).Trim(); $file = Join-Path $work $json
  $legacy = [IO.File]::ReadAllText($file) | ConvertFrom-Json
  $legacy.PSObject.Properties.Remove('Branch'); $legacy.PSObject.Properties.Remove('MergeWriteTime')
  [IO.File]::WriteAllText($file, ($legacy | ConvertTo-Json -Depth 6))
  [void](G @('branch','twin','HEAD'))
  Check (Rejected { Action 'continue-merge' }) 'Guessed the destination branch for an ambiguous old approval.'
  [void](G @('branch','-d','twin')); [void](Action 'continue-merge')
  Check ((G @('show','-s','--format=%P')).Trim() -eq ($legacy.Ours+' '+$legacy.Theirs)) 'Could not resume an unambiguous old session.'
}
Case 'new-ordinary-merge' {
  Diverge $true; [void](Action 'merge-manual' @{reference='refs/heads/incoming'}); [void](G @('merge','--abort'))
  [void](Action 'merge' @{reference='refs/heads/incoming'})
  [void](Action 'resolve-conflict' @{path='revision.txt';side='theirs'}); [void](Action 'continue-merge')
  Check ((G @('show','HEAD:revision.txt')).Trim() -ceq 'incoming') 'An externally ended manual session blocked a new ordinary merge.'
}
Case 'stash-manual-resolution' {
  WriteFile 'part.txt' 'base'; Commit 'part base'; WriteFile 'part.txt' 'stash'; [void](Action 'stash-save')
  WriteFile 'part.txt' 'branch'; Commit 'change on branch'; $oid = (G @('rev-parse','stash@{0}')).Trim()
  [void](Action 'stash-apply' @{reference='stash@{0}';oid=$oid})
  Check ((G @('ls-files','--unmerged','-z')).Length -gt 0 -and -not [Gitpolar.SolidWorks.RepositoryGit]::Merging($work)) 'Expected a real stash conflict without MERGE_HEAD.'
  $pane = [Gitpolar.SolidWorks.GitpolarPane]::new($null)
  $argsForCommit = New-Object 'System.Collections.Generic.Dictionary[string,object]'
  $argsForCommit.Add('message','resolved stash'); $argsForCommit.Add('files',[string[]]@('part.txt'))
  Check (Rejected { $pane.Dispatch('commit',$argsForCommit,$work).GetAwaiter().GetResult() }) 'Ordinary save committed unstaged conflict markers.'
  WriteFile 'part.txt' 'hand-resolved stash'; [void](Action 'mark-manual-resolved' @{path='part.txt';confirmed=$true})
  [void]$pane.Dispatch('commit',$argsForCommit,$work).GetAwaiter().GetResult()
  Check ((G @('show','HEAD:part.txt')) -ceq 'hand-resolved stash' -and (G @('rev-parse','stash@{0}')).Trim() -eq $oid) 'Lost the hand-edited result or original stash.'
}
Case 'large-package-attributes' {
  WriteFile '.gitattributes' '*.SLDPRT lockable'; Commit 'lockable parts'
  [string[]]$names = @(foreach ($i in 1..350) { '长装配目录/'+('a'*90)+$i+'.SLDPRT' })
  Check ((($names -join ' ').Length) -gt 32767) 'Fixture is shorter than the Windows command-line limit.'
  $pane = [Gitpolar.SolidWorks.GitpolarPane]::new($null)
  $locks = $pane.GetType().GetMethod('EnsureMergeLocks',[Reflection.BindingFlags]'Instance, NonPublic')
  [void]$locks.Invoke($pane.PSObject.BaseObject,@($work.PSObject.BaseObject,$names.PSObject.BaseObject)).GetAwaiter().GetResult()
}
Case 'aliased-output-targets' {
  Diverge; [void](Action 'merge-manual' @{reference='refs/heads/incoming'})
  $session = [Gitpolar.SolidWorks.CadMergeStore]::Load($work); $session.State = 'editing'; $session.PlanId = 'test-plan'
  $fields = New-Object 'System.Collections.Generic.Dictionary[string,object]'
  $rows = New-Object 'System.Collections.Generic.List[System.Collections.Generic.Dictionary[string,object]]'
  foreach ($pair in @(@('Assembly.SLDASM','Assembly.SLDASM'),@('A.SLDPRT','parts/Plate.SLDPRT'),@('B.SLDPRT','parts//Plate.SLDPRT'))) {
    if ($pair[0] -ne 'Assembly.SLDASM') { WriteFile $pair[0] $pair[0] }
    $entry = New-Object Gitpolar.SolidWorks.CadMergeOutput; $entry.Source = Join-Path $work $pair[0]; $entry.Target = $pair[1]
    $entry.Hash = [Gitpolar.SolidWorks.CadMergeStore]::Hash($entry.Source); $session.Plan.Add($entry)
    $row = New-Object 'System.Collections.Generic.Dictionary[string,object]'; $row.Add('source',$entry.Source); $row.Add('target',$entry.Target); $rows.Add($row)
  }
  $session.Result = $session.Plan[0].Source; [Gitpolar.SolidWorks.CadMergeStore]::Save($work,$session)
  $fields.Add('planId',$session.PlanId); $fields.Add('confirmed',$true); $fields.Add('files',$rows.ToArray())
  $pane = [Gitpolar.SolidWorks.GitpolarPane]::new($null); $errorText = ''
  try { [void]$pane.Dispatch('apply-cad-result',$fields,$work).GetAwaiter().GetResult() } catch { $errorText = $_.Exception.GetBaseException().Message }
  Check ($errorText -like '*结果路径重复*') "Two rows mapped to the same Windows file without detection before export. Failure [$errorText]."
}
[pscustomobject]@{passed=$passed.ToArray();failures=$failures.ToArray();fixture=$root} | ConvertTo-Json -Depth 3
if ($failures.Count) { throw "$($failures.Count) merge integrity regression(s) failed." }
