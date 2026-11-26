"""从固定 Git 对象构建。所有生成、编译和版本注入只发生在工位独立目录。"""
import hashlib
import json
import os
from pathlib import Path, PureWindowsPath
import re
import shutil
import subprocess
import tarfile
import tempfile
import xml.etree.ElementTree as ET

from telemetry import version_frame

HASH = re.compile(r'[0-9a-f]{40}')
REPO = re.compile(r'(github|gitee)\.com/[\w.-]+/[\w.-]+')
ARM_REPO = 'gitee.com/cambridge-linker/27_Reinstall_RoboticArm'
ARM_PROFILES = [
    {'id':'engineer-dm','family':'dm','trees':['b45fb23a37d076e0fa88924c474f21395095a2b5'],
     'project':'MDK-ARM/CtrBoard-H7_StandardRobotpp.uvprojx','target':'CtrBoard-H7_StandardRobotpp',
     'ioc':'CtrBoard-H7_StandardRobotpp.ioc'},
    {'id':'engineer-dji','family':'dji','trees':['911e4a64fe7aa5347eaf91bbf94a010c631459db'],
     'project':'MDK-ARM/standard_robot.uvprojx','target':'standard_robot','ioc':'standard_robot.ioc',
     'preserveSources':['Src/stm32f4xx_it.c'],
     'extraSourceDir':'application/lift_video','extraSources':['lift_video_task.c','lift_video_engineer.c']}
]
for _profile in ARM_PROFILES:
    _profile.update(repository=ARM_REPO,identityMode='srpp',usbSource='application/communication/usb_task.c',
                    editableSourceDirs=['application/mechanical_arm','application/lift_video',
                                        'components/algorithm','components/controller','components/devices'])

def execute(args, cwd, timeout=900):
    run = subprocess.run([str(x) for x in args], cwd=cwd, capture_output=True, timeout=timeout,
                         creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
    return run.returncode, (run.stdout + run.stderr).decode(errors='replace')

def git(cwd, *args):
    code, text = execute(['git','-C',cwd,*args],cwd)
    if code != 0:
        raise RuntimeError('Git operation failed: ' + text[-1200:])
    return text.strip()

def within(root, relative):
    path = (root / relative).resolve()
    if path == root or not path.is_relative_to(root):
        raise ValueError('Path escapes the build directory.')
    return path

def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source,'sha256').hexdigest()

def image_has_identity(image,marker):
    if image.suffix.lower() != '.hex':
        return marker in image.read_bytes()
    # Intel HEX 的记录边界可以落在版号中间；仅拼接地址连续的有效载荷。
    upper = 0
    next_address = None
    tail = b''
    found = False
    with image.open(encoding='ascii') as records:
        for line in records:
            if not line.startswith(':'):
                raise ValueError('Invalid Intel HEX record.')
            data = bytes.fromhex(line[1:])
            if len(data)<5 or len(data)!=data[0]+5 or sum(data)&255:
                raise ValueError('Invalid Intel HEX length or checksum.')
            kind,content = data[3],data[4:-1]
            if kind in (2,4):
                upper = int.from_bytes(content,'big') << (4 if kind==2 else 16)
            if kind == 0:
                address = upper + int.from_bytes(data[1:3],'big')
                segment = (tail if address==next_address else b'') + content
                found = found or marker in segment
                tail = segment[-(len(marker)-1):]
                next_address = address + len(content)
    return found

def same_origin(url, repository):
    return url.rstrip('/').removesuffix('.git').lower() == ('https://' + repository).lower()

def source_objects(config, source):
    repository, oid, tree = (source[k] for k in ('repository','oid','tree'))
    if not REPO.fullmatch(repository) or not HASH.fullmatch(oid) or not HASH.fullmatch(tree):
        raise ValueError('Invalid source identity.')
    local = Path(config.get('checkout','')).resolve()
    if config.get('checkout') and local.exists():
        if same_origin(git(local,'remote','get-url','origin'),repository):
            if execute(['git','-C',local,'cat-file','-e',oid+'^{commit}'],local)[0] == 0:
                return local
    cache = Path(config['workdir']).resolve() / ('objects-' + hashlib.sha256(repository.encode()).hexdigest()[:16])
    cache.mkdir(parents=True,exist_ok=True)
    git(cache,'init','--bare','.')
    git(cache,'fetch','--no-tags','https://'+repository+'.git',oid)
    return cache

def export_source(objects, source, dest):
    oid = git(objects,'rev-parse','--verify',source['oid'] + ':' + source['directory'])
    if oid != source['tree']:
        raise ValueError('Board directory does not match the selected source tree.')
    with tempfile.TemporaryFile() as stream:
        subprocess.run(['git','-C',str(objects),'archive','--format=tar',oid],check=True,stdout=stream,
                       creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        stream.seek(0)
        with tarfile.open(fileobj=stream,mode='r|') as archive:
            for item in archive:
                parts = item.name.split('/')
                if (not (item.isdir() or item.isreg()) or '\\' in item.name or ':' in item.name or
                    any(part in ('','.','..') or part.endswith(('.',' ')) or PureWindowsPath(part).is_reserved() for part in parts)):
                    raise ValueError('Unsupported path or link in firmware source.')
                target = within(dest,item.name)
                if item.isdir():
                    target.mkdir(parents=True,exist_ok=True)
                    continue
                target.parent.mkdir(parents=True,exist_ok=True)
                with archive.extractfile(item) as inp, target.open('xb') as out:
                    shutil.copyfileobj(inp,out)

def select_profile(config, job):
    source = job['source']
    for profile in config.get('profiles',ARM_PROFILES):
        if (profile['id'] == job['profile'] and profile['repository'] == source['repository']
                and profile['family'] == source['family']):
            return profile
    raise ValueError('No local workstation target matches this board.')

def check_tree(objects,source,profile):
    if source['tree'] in profile['trees']:
        return
    # 同一个已核对的机械臂工具链允许跨分支构建机械臂源文件的修改。
    def eligible(path):
        if path.lower().endswith(('.drawio','.md')):
            return True
        return path.endswith(('.c','.h')) and any(path.startswith(folder.rstrip('/')+'/')
               for folder in profile.get('editableSourceDirs',[]))
    for base in profile['trees']:
        if execute(['git','-C',objects,'cat-file','-e',base+'^{tree}'],objects)[0]:
            continue
        paths = git(objects,'-c','core.quotepath=false','diff','--no-renames','--name-only','-z',base,source['tree']).split('\0')
        if all(eligible(path) for path in paths if path):
            return
    raise ValueError('The source changes the registered board configuration or toolchain. Select a locally reviewed board profile.')

def stamp(root,profile,source,build_id):
    frame = version_frame(source,build_id)
    content = ('/* Generated from the selected Git revision. */\n'
               '#ifndef GITPOLAR_BUILD_H\n#define GITPOLAR_BUILD_H\n'
               '#define GITPOLAR_VERSION_LINE "' + frame[4:-2].decode('ascii') + '\\r\\n"\n'
               'static unsigned char gitpolar_identity_frame[] = {' +
               ','.join('0x%02x'%b for b in frame) + '};\n#endif\n')
    if profile.get('identityMode') != 'srpp':
        header = within(root,profile['identityHeader'])
        header.write_text(content,encoding='ascii')
        return
    usb = within(root,profile['usbSource'])
    data = usb.read_bytes()
    marker = b'        UsbSendData();'
    include = b'#include "usb_task.h"'
    if data.count(marker) != 1 or data.count(include) != 1:
        raise ValueError('Cannot locate the registered telemetry hook in this source.')
    emit = b'''        static uint32_t gitpolar_last_report;
        uint32_t gitpolar_now = HAL_GetTick();
        if ((uint32_t)(gitpolar_now - gitpolar_last_report) >= 1000U &&
            USB_Transmit(gitpolar_identity_frame, sizeof(gitpolar_identity_frame)) == 0U) {
            gitpolar_last_report = gitpolar_now;
        } else {
            UsbSendData();
        }'''
    if b'USB_OUT_PROTO == USB_PROTO_VOFA && VofaGetEnable()' in data:
        emit = emit.replace(b'            USB_Transmit(',b'            !(USB_OUT_PROTO == USB_PROTO_VOFA && VofaGetEnable()) &&\n            USB_Transmit(')
    usb.with_name('gitpolar_build.h').write_text(content,encoding='ascii')
    usb.write_bytes(data.replace(include,include+b'\n#include "gitpolar_build.h"').replace(marker,emit))

def generate(config,root,profile):
    ioc = within(root,profile['ioc'])
    mx = Path(config.get('cubemx',r'D:\ST\STM32CubeMX\STM32CubeMX.exe')).resolve()
    script = root.parent / 'generate.mx'
    original = ioc.read_text(encoding='utf-8-sig',errors='replace')
    name = re.search(r'^ProjectManager\.ProjectName=(.+)$',original,re.M)
    if not name or name.group(1).strip() != root.name:
        raise ValueError('CubeMX project name must match its isolated project directory.')
    location = re.search(r'^ProjectManager\.MainLocation=(.+)$',original,re.M)
    src = within(root,location[1].strip().replace('\\','/') if location else 'Src')
    if src.name.lower() != 'src':
        raise ValueError('CubeMX code generation requires a registered Src or Core/Src layout.')
    target = src.parent
    # 部分工程在生成文件中手工接管中断；保留选中提交中的实际实现。
    kept = {}
    for name in profile.get('preserveSources',[]):
        path = within(root,name)
        kept[path] = path.read_bytes()
    # 使用该提交指定的固件包，避免旧 .ioc 在后台等待升级确认。保留原换行与所有外设参数。
    if re.search(r'^ProjectManager\.FirmwarePackage=\S',original,re.M):
        settings = ioc.read_bytes()
        settings = re.sub(rb'(?m)^(ProjectManager\.(?:AskForMigrate|LastFirmware)=)true(?=\r?$)',
                          rb'\g<1>false',settings)
        ioc.write_bytes(settings)
    # 仅重生 CubeMX 负责的源文件；Keil 分组、编译选项和仓库内的库沿用选定提交。
    script.write_text('config load "'+ioc.as_posix()+'"\nproject path "'+root.parent.as_posix()+'"\ngenerate code "'+target.as_posix()+'"\nexit\n',encoding='utf-8')
    output = root.parent / 'cubemx.log'
    try:
        with output.open('wb') as stream:
            completed = subprocess.run([str(mx.parent/'jre/bin/java.exe'),'-jar',str(mx),'-q',str(script)],
                                       cwd=root,stdout=stream,stderr=subprocess.STDOUT,timeout=config.get('cubeTimeout',1800),
                                       creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
    except subprocess.TimeoutExpired as error:
        tail = output.read_text(encoding='utf-8',errors='replace')[-1000:]
        raise RuntimeError('CubeMX timed out while generating or obtaining its firmware pack. '+tail) from error
    log = output.read_text(encoding='utf-8',errors='replace')
    generated = re.search(r'(?im)^Code succes{1,2}fully generated under ([^\r\n]+)',log)
    if (completed.returncode or not generated or Path(generated[1].strip().strip('"')).resolve() != target
            or re.search(r'(?im)(code generation failed|generation.{0,30}failed|not available in the local repository)',log)):
        raise RuntimeError('CubeMX did not regenerate the selected board sources. Check the .ioc and MCU firmware pack. '+log[-1500:])
    for path,content in kept.items():
        path.write_bytes(content)

def project_root(directory,profile,generated):
    if not generated:
        return directory/'source'
    return within(directory/'source',Path(profile['ioc']).stem)

def target_outputs(root,profile):
    project = within(root,profile['project'])
    xml = ET.parse(project)
    target = next((t for t in xml.findall('./Targets/Target') if t.findtext('TargetName')==profile['target']),None)
    if target is None:
        raise ValueError('Keil Target does not exist in this project.')
    common = target.find('./TargetOption/TargetCommonOption')
    for phase in ('BeforeCompile','BeforeMake','AfterMake'):
        for number in ('1','2'):
            cmd = common.findtext(phase+'/UserProg'+number+'Name','').strip()
            if cmd and common.findtext(phase+'/RunUserProg'+number)=='1':
                raise ValueError('Registered firmware builds require a self-contained Keil target without external commands.')
    name = common.findtext('OutputName') or project.stem
    parent = common.findtext('OutputDirectory') or '.'
    axf = within(root,project.parent / parent / (name + '.axf'))
    image = axf.with_suffix('.hex') if common.findtext('CreateHexFile')=='1' else axf
    return project,axf,image

def register_sources(root,profile):
    if not profile.get('extraSourceDir'):
        return
    project = within(root,profile['project'])
    directory = within(root,profile['extraSourceDir'])
    xml = ET.parse(project)
    target = next(t for t in xml.findall('./Targets/Target') if t.findtext('TargetName') == profile['target'])
    includes = target.find('./TargetOption/TargetArmAds/Cads/VariousControls/IncludePath')
    relative = Path(os.path.relpath(directory,project.parent)).as_posix()
    if relative not in (includes.text or '').replace('\\','/').split(';'):
        includes.text = (includes.text or '') + ';' + relative
    files = {p.text.replace('\\','/') for p in target.findall('./Groups/Group/Files/File/FilePath') if p.text}
    missing = [name for name in profile['extraSources'] if relative+'/'+name not in files]
    if missing:
        group = ET.SubElement(target.find('Groups'),'Group')
        ET.SubElement(group,'GroupName').text = 'Lift video'
        listing = ET.SubElement(group,'Files')
        for name in missing:
            if not (directory/name).is_file():
                raise ValueError('Missing registered board source: '+name)
            item = ET.SubElement(listing,'File')
            for label,text in [('FileName',name),('FileType','1'),('FilePath',relative+'/'+name)]:
                ET.SubElement(item,label).text = text
    xml.write(project,encoding='utf-8',xml_declaration=True)

def run_keil(config,project,profile,option,log):
    keil = config.get('keil',r'D:\Keil5\UV4\UV4.exe')
    args = [keil,option,project,'-t',profile['target'],'-o',log,'-j0']
    code,output = execute(args,project.parent)
    data = log.read_bytes() if log.exists() else b''
    encoding = 'utf-16' if data.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8'
    report = data.decode(encoding,errors='replace') if data else output
    failed = re.search(r'\b[1-9]\d*\s+Error\(s\)|\b(?:Download|Flash|Verify|Verification|Programming)\s+failed\b',report,re.I)
    if code not in (0,1) or failed:
        details = [line.strip() for line in report.splitlines() if re.search(r'\berror[: ]|\bfailed\b',line,re.I)]
        raise RuntimeError('Keil failed ('+str(code)+'): '+'\n'.join(details[:10])+'\n'+report[-600:])
    return report

def run_build(config,job):
    profile = select_profile(config,job)
    work = Path(config['workdir']).resolve()
    directory = within(work,job['id'])
    root = project_root(directory,profile,job.get('generate'))
    root.mkdir(parents=True,exist_ok=False)
    source = job['source']
    objects = source_objects(config,source)
    check_tree(objects,source,profile)
    export_source(objects,source,root)
    if job.get('generate'):
        generate(config,root,profile)
    stamp(root,profile,source,job['id'])
    register_sources(root,profile)
    project,axf,image = target_outputs(root,profile)
    # Rebuild 必须产生新的映像，源码库中已有的产物不能充当本次结果。
    for path in {axf,image}:
        path.unlink(missing_ok=True)
    log = directory/'build.log'
    report = run_keil(config,project,profile,'-r',log)
    if not axf.is_file() or not image.is_file() or not image_has_identity(image,version_frame(source,job['id'])[4:-2]):
        raise RuntimeError('The build did not produce a fresh image carrying the selected firmware identity. '+report[-1200:])
    meta = {'source':source,'buildId':job['id'],'profile':profile['id'],'target':profile['target'],'generate':bool(job.get('generate')),
            'sha256':digest(image),'axfSha256':digest(axf),'bytes':image.stat().st_size,'image':image.name}
    (directory/'result.json').write_text(json.dumps(meta),encoding='utf-8')
    return {**meta,'log':report[-3000:]}

def run_flash(config,job):
    profile = select_profile(config,job)
    work = Path(config['workdir']).resolve()
    directory = within(work,job['build'])
    meta = json.loads((directory/'result.json').read_text(encoding='utf-8'))
    project,axf,image = target_outputs(project_root(directory,profile,job.get('generate')),profile)
    if (meta['source'] != job['source'] or meta['buildId'] != job['build'] or meta['profile'] != profile['id'] or meta['target'] != profile['target'] or
        meta['generate'] != bool(job.get('generate')) or meta['sha256'] != job['sha256'] or
        digest(image) != meta['sha256'] or digest(axf) != meta['axfSha256']):
        raise ValueError('The selected build or its image changed.')
    report = run_keil(config,project,profile,'-f',directory/('flash-'+job['id']+'.log'))
    if not re.search(r'(?i)\b(?:flash load finished|verify ok|verify successful|programming done|download verified)\b',report):
        raise RuntimeError('Keil did not confirm programming: '+report[-1200:])
    return {'sha256':meta['sha256'],'log':report[-3000:]}
