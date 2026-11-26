import json
from pathlib import Path
import struct
import sys
import tempfile
import unittest
from unittest.mock import patch
import uuid

sys.path.insert(0,str(Path(__file__).resolve().parents[1] / 'tools' / 'firmware'))
import serial
from station import Console
from telemetry import Receiver, checksum, version_frame
from toolchain import run_flash, digest, check_tree, generate, git

SOURCE = {'repository':'gitee.com/example/bench','ref':'teams/lab/dm','oid':'2'*40,'family':'dm','tree':'1'*40}

class StationTests(unittest.TestCase):
    def test_srpp_chunking_corrupt_and_legacy(self):
        self.assertEqual(checksum(b'123456789',8),0x0b)
        self.assertEqual(checksum(b'123456789',16),0x6f91)
        payload = struct.pack('<I10sBf',152,b'angle',1,3.25)
        lead = bytes([0x5a,len(payload),1])
        packet = lead + bytes([checksum(lead,8)]) + payload
        packet += struct.pack('<H',checksum(packet,16))
        rx = Receiver()
        self.assertEqual(rx.feed(packet[:5])['events'],[])
        self.assertEqual(rx.feed(packet[5:])['events'][0]['values'],{'angle':3.25})
        self.assertIsNone(rx.version)
        invalid = bytearray(version_frame(SOURCE)); invalid[-1] ^= 1
        rx.feed(invalid)
        self.assertIsNone(rx.version)
        frame = version_frame(SOURCE)
        for chunk in [frame[:1],frame[1:3],frame[3:16],frame[16:]]:
            rx.feed(chunk)
        self.assertEqual(rx.version['ref'],SOURCE['ref'])
        self.assertEqual(rx.version['oid'],SOURCE['oid'])
        text = Receiver()
        text.feed(b'old firmware output\n')
        text.feed(frame[4:-2]+b'\r')
        self.assertIsNone(text.version)
        text.feed(b'\n')
        self.assertEqual(text.version['repository'],SOURCE['repository'])

    def test_serial_loopback_is_received_by_live_reader(self):
        import time
        console = Console()
        try:
            with console.lock:
                console.device = serial.serial_for_url('loop://',timeout=0)
                console.device.write(version_frame(SOURCE))
            until = time.monotonic()+2
            while time.monotonic()<until:
                status,samples = console.collect()
                if status['identity']:
                    break
                time.sleep(.02)
            self.assertTrue(samples)
            self.assertEqual(status['identity']['oid'],SOURCE['oid'])
            console.close()
            self.assertIsNone(console.collect()[0]['identity'])
        finally:
            console.shutdown()

    def test_flash_uses_the_selected_unchanged_artifacts(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); build=str(uuid.uuid4()); project=root/build/'source'
            project.mkdir(parents=True)
            (project/'bench.uvprojx').write_text('<Project><Targets><Target><TargetName>Bench</TargetName>'
                '<TargetOption><TargetCommonOption><OutputName>bench</OutputName><OutputDirectory>out</OutputDirectory>'
                '<CreateHexFile>1</CreateHexFile></TargetCommonOption></TargetOption></Target></Targets></Project>')
            (project/'out').mkdir(); image=project/'out/bench.hex'; axf=project/'out/bench.axf'
            image.write_bytes(b'fixture hex');axf.write_bytes(b'fixture debug')
            cfg={'workdir':tmp,'profiles':[{'id':'test','target':'Bench','project':'bench.uvprojx',
                  'trees':[SOURCE['tree']],'family':'dm','repository':SOURCE['repository']}]}
            meta={'source':SOURCE,'buildId':build,'profile':'test','target':'Bench','generate':False,'sha256':digest(image),'axfSha256':digest(axf)}
            (project.parent/'result.json').write_text(json.dumps(meta))
            job={'source':SOURCE,'profile':'test','id':str(uuid.uuid4()),'build':build,'sha256':digest(image)}
            with patch('toolchain.run_keil',return_value='Verify OK.') as mock:
                self.assertEqual(run_flash(cfg,job)['sha256'],digest(image))
                self.assertEqual(mock.call_args.args[3],'-f')
                image.write_bytes(b'changed')
                with self.assertRaises(ValueError):
                    run_flash(cfg,job)
                self.assertEqual(mock.call_count,1)

    def test_cubemx_uses_pinned_package_and_confirms_selected_output(self):
        from subprocess import CompletedProcess
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()/'Bench'
            (root/'Core/Src').mkdir(parents=True)
            ioc = root/'Bench.ioc'
            ioc.write_bytes(b'ProjectManager.ProjectName=Bench\r\nProjectManager.FirmwarePackage=STM32Cube FW_F4 V1.24.1\r\n'
                            b'ProjectManager.MainLocation=Core/Src\r\nProjectManager.AskForMigrate=true\r\nProjectManager.LastFirmware=true\r\nPA0.Signal=GPIO_Input\r\n')
            irq = root/'Core/Src/interrupts.c'
            irq.write_bytes(b'board interrupt handler')
            profile = {'ioc':ioc.name,'preserveSources':['Core/Src/interrupts.c']}
            def cubemx(args, **options):
                script = Path(args[-1]).read_text(encoding='utf-8')
                self.assertIn('generate code "'+(root/'Core').as_posix()+'"',script)
                self.assertIn(b'ProjectManager.LastFirmware=false\r\nPA0.Signal=GPIO_Input',ioc.read_bytes())
                self.assertIn(b'ProjectManager.AskForMigrate=false',ioc.read_bytes())
                irq.write_bytes(b'generic interrupt handler')
                options['stdout'].write(('Code succesfully generated under '+output+'\n').encode())
                return CompletedProcess(args,0)
            with patch('toolchain.subprocess.run',side_effect=cubemx):
                output = (root/'Core').as_posix()
                generate({},root,profile)
                self.assertEqual(irq.read_bytes(),b'board interrupt handler')
                output = root.parent.as_posix()
                with self.assertRaisesRegex(RuntimeError,'selected board sources'):
                    generate({},root,profile)

    def test_arm_edits_and_drawings_preserve_reviewed_target_but_toolchain_edits_do_not(self):
        from toolchain import ARM_REPO
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            git(root,'init','-q');(root/'bench.uvprojx').write_text('target')
            git(root,'add','.'); base=git(root,'write-tree')
            profile={'repository':ARM_REPO,'trees':[base],'editableSourceDirs':['application/mechanical_arm']}
            (root/'wiring.drawio').write_text('diagram')
            folder=root/'application/mechanical_arm';folder.mkdir(parents=True)
            (folder/'readback.c').write_text('/* published arm variant */')
            git(root,'add','.'); check_tree(root,{'tree':git(root,'write-tree')},profile)
            (root/'bench.uvprojx').write_text('changed build parameters')
            git(root,'add','.')
            with self.assertRaises(ValueError):
                check_tree(root,{'tree':git(root,'write-tree')},profile)

if __name__=='__main__':
    unittest.main()
