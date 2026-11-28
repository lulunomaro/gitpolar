"""Run a Gitpolar shell workflow against an immutable Git archive on an isolated Linux worker."""
import json, os, re, shutil, subprocess, sys, tempfile
from pathlib import Path


def check(condition, message):
    if not condition:
        raise ValueError(message)


def task_limit():
    # Linux counts every thread of the service account against RLIMIT_NPROC.
    tasks = 0
    for proc in Path('/proc').iterdir():
        try:
            if proc.name.isdecimal() and proc.stat().st_uid == os.getuid():
                tasks += len(list((proc / 'task').iterdir()))
        except (FileNotFoundError, PermissionError):
            continue
    return tasks + 64


def run():
    import yaml
    job = json.load(sys.stdin)
    doc = yaml.safe_load(job['yaml']) or {}
    check(isinstance(doc, dict), 'Expected a YAML workflow mapping.')
    triggers = doc.get('on', doc.get(True))
    if isinstance(triggers, str): triggers = [triggers]
    check(isinstance(triggers, (dict, list)), 'Workflow has no on: trigger.')
    event = job['event']
    if event not in triggers: return 'skipped'
    filters = (triggers.get(event) or {}) if isinstance(triggers, dict) else {}
    check(isinstance(filters,dict) and not set(filters)-{'branches'}, 'Unsupported event filters. Supported filter: branches.')
    patterns = filters.get('branches')
    if patterns:
        import fnmatch
        check(isinstance(patterns,list) and all(isinstance(p,str) and not p.startswith('!') for p in patterns), 'Expected positive branch patterns.')
        if not any(fnmatch.fnmatchcase(job.get('baseBranch') or job['branch'],p) for p in patterns): return 'skipped'
    check(not set(doc)-{'name','on',True,'jobs','permissions'}, 'Unsupported top-level workflow setting.')
    jobs = doc.get('jobs', {})
    check(isinstance(jobs,dict) and 0<len(jobs)<=12, 'Expected 1–12 jobs.')
    done=set()
    with tempfile.TemporaryDirectory(prefix='gitpolar-ci-') as temporary:
        archive=Path(temporary)/'source.tar'
        # Limit archive generation as well as commands inside the sandbox.
        subprocess.run(['prlimit','--fsize=134217728','--','git','--git-dir='+job['bare'],'archive','--format=tar','-o',str(archive),job['oid']],check=True,timeout=60)
        while len(done)<len(jobs):
            advanced=False
            for name, spec in jobs.items():
                if name in done: continue
                check(isinstance(spec,dict) and not set(spec)-{'name','runs-on','steps','needs'}, 'Unsupported job setting in '+str(name))
                needs=spec.get('needs',[])
                if isinstance(needs,str): needs=[needs]
                if not all(n in done for n in needs): continue
                check(spec.get('runs-on') in ('gitpolar','self-hosted','ubuntu-latest'), 'Choose runs-on: gitpolar for this Linux worker.')
                steps=spec.get('steps');check(isinstance(steps,list) and 0<len(steps)<=100,'Expected 1–100 steps.')
                commands = ['set -eu', 'cd /work', 'tar -xf /source.tar']
                for step in steps:
                    check(isinstance(step,dict) and not set(step)-{'name','uses','run','shell'},'Unsupported step setting.')
                    if 'uses' in step:
                        check(re.fullmatch(r'actions/checkout@v[23456]',str(step['uses'])) and 'run' not in step,'This Linux worker supports actions/checkout and shell steps.')
                        continue
                    script=step.get('run');check(isinstance(script,str) and '${{' not in script,'A shell script without GitHub expression interpolation is required.')
                    shell=step.get('shell','bash');check(shell in ('bash','sh'),'Supported shells: bash and sh.')
                    import shlex
                    commands.extend(['printf "%s\\n" '+shlex.quote(str(step.get('name','Run step'))),shell+(' -eo pipefail -c ' if shell=='bash' else ' -e -c ')+shlex.quote(script)])
                print('Job '+str(name),flush=True)
                instance_binary=Path('/opt/gitpolar/runtime/bin/bwrap')
                sandbox=str(instance_binary) if instance_binary.is_file() else 'bwrap'
                args=['prlimit','--as=1610612736','--cpu=75','--fsize=67108864','--nofile=256','--nproc='+str(task_limit()),'--',sandbox,'--unshare-all','--unshare-user','--disable-userns','--die-with-parent','--new-session','--clearenv','--setenv','HOME','/tmp','--setenv','PATH','/usr/bin:/bin','--setenv','GITHUB_WORKSPACE','/work','--setenv','GITHUB_SHA',job['oid'],'--setenv','GITHUB_REF_NAME',job['branch'],'--ro-bind','/usr/bin','/usr/bin','--ro-bind','/usr/lib','/usr/lib','--symlink','usr/bin','/bin','--symlink','usr/lib','/lib']
                if Path('/usr/lib64').exists(): args+=['--ro-bind','/usr/lib64','/usr/lib64','--symlink','usr/lib64','/lib64']
                args+=['--proc','/proc','--dev','/dev','--size','33554432','--tmpfs','/tmp','--size','268435456','--tmpfs','/work','--ro-bind',str(archive),'/source.tar','--chdir','/work','/bin/sh','-c','\n'.join(commands)]
                subprocess.run(args,check=True,timeout=100)
                done.add(name);advanced=True
            check(advanced,'Unresolved job dependency.')
    return 'success'

if __name__=='__main__':
    try: sys.exit(78 if run()=='skipped' else 0)
    except subprocess.CalledProcessError as error: print('Process exit '+str(error.returncode),file=sys.stderr);sys.exit(1)
    except Exception as error: print(str(error)[:1000],file=sys.stderr);sys.exit(1)
