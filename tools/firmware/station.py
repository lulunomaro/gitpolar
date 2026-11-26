"""Windows 工位。主动连接 NAS，串口和调试器都属于运行本程序的电脑。"""
import argparse
import ipaddress
from collections import deque
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
from threading import Lock, Thread, Event
import time
from urllib.parse import urlparse
import urllib.request
import uuid

import serial
from serial.tools import list_ports
from telemetry import Receiver
from toolchain import ARM_PROFILES, run_build, run_flash

class Console:
    def __init__(self):
        self.lock = Lock()
        self.rx = Receiver()
        self.device = None
        self.error = None
        self.dropped = 0
        self.samples = deque(maxlen=96)
        self.stop = Event()
        self.thread = Thread(target=self.read_loop,daemon=True)
        self.thread.start()

    def open(self, name, baud):
        ports = {p.device.upper() for p in list_ports.comports()}
        if name not in ports:
            raise ValueError('Port is not present on this workstation.')
        with self.lock:
            self._close()
            port = serial.Serial(port=None,baudrate=baud,timeout=0)
            port.dtr = False
            port.rts = False
            port.port = name
            port.open()
            self.device = port

    def _close(self):
        if self.device is not None:
            self.device.close()
        self.device = None
        self.rx = Receiver()
        self.error = None

    def close(self):
        with self.lock:
            self._close()

    def read_loop(self):
        while not self.stop.wait(.015):
            with self.lock:
                if self.device is None:
                    continue
                try:
                    raw = self.device.read(min(self.device.in_waiting,1024))
                    if raw:
                        if len(self.samples) == self.samples.maxlen:
                            self.dropped += 1
                        self.samples.append({'port':self.device.port,**self.rx.feed(raw)})
                except (OSError,serial.SerialException) as exc:
                    self._close()
                    self.error = str(exc)

    def collect(self):
        with self.lock:
            # 限制每次 HTTP 上行的串口数据量，序号保留在 NAS。
            samples = [self.samples.popleft() for _ in range(min(len(self.samples),12))]
            version = self.rx.version
            if version and int(time.time()*1000)-version['observedAt'] > 5000:
                version = None
            return {'port':self.device.port if self.device else None,'identity':version,
                    'serialError':self.error,'droppedChunks':self.dropped},samples

    def shutdown(self):
        self.stop.set()
        self.thread.join()
        self.close()

def perform(config,console,job):
    if job['kind'] == 'serial-open':
        console.open(job['port'],job['baud'])
        return {'port':job['port'],'baud':job['baud']}
    if job['kind'] == 'serial-close':
        console.close()
        return {}
    if job['kind'] == 'build':
        return run_build(config,job)
    if job['kind'] == 'flash':
        # 同一串口重新枚举后必须取得新回报，旧版号不能充当烧录后的证据。
        console.close()
        return run_flash(config,job)
    raise ValueError('Unknown workstation operation.')

def exchange(url,key,message):
    request = urllib.request.Request(url,data=json.dumps(message,allow_nan=False).encode('utf-8'),
             headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
    host = urlparse(url).hostname
    try:
        direct = ipaddress.ip_address(host).is_private
    except ValueError:
        direct = host == 'localhost' or host.endswith('.localhost')
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({})) if direct else urllib.request.build_opener()
    with opener.open(request,timeout=12) as response:
        return json.load(response)

def serve(config,key):
    url = config['server'].rstrip('/') + '/api/firmware/station/exchange'
    parsed = urlparse(url)
    if parsed.scheme not in ('http','https') or parsed.username or parsed.password:
        raise ValueError('Set server to the gitpolar HTTP(S) origin.')
    console = Console()
    session = str(uuid.uuid4())
    profiles = [{**{k:p[k] for k in ('id','family','repository','target','trees')},
                 'editableSourceDirs':p.get('editableSourceDirs',[])} for p in config.get('profiles',ARM_PROFILES)]
    future = active = message = None
    batch = 0
    last_error = None
    try:
        with ThreadPoolExecutor(max_workers=1) as worker:
            while True:
                if message is None:
                    batch += 1
                    status,samples = console.collect()
                    status['ports'] = [p.device for p in list_ports.comports()]
                    status['profiles'] = profiles
                    message = {'session':session,'batch':batch,'active':active,'status':status,'samples':samples}
                    if future and future.done():
                        try:
                            result = {'state':'ok','result':future.result()}
                        except Exception as exc:
                            result = {'state':'failed','result':{'error':str(exc)[:4000]}}
                        message.update(completed={'id':active,**result},active=None)
                        future = active = None
                try:
                    response = exchange(url,key,message)
                    if response.get('batch') != batch:
                        raise ValueError('Unexpected NAS acknowledgement.')
                    last_error = None
                except (OSError,ValueError) as exc:
                    if str(exc) != last_error:
                        print('NAS connection:',exc,flush=True)
                        last_error = str(exc)
                    time.sleep(2)
                    continue
                message = None
                job = response.get('job')
                if job is not None and future is None:
                    active = str(uuid.UUID(job['id']))
                    future = worker.submit(perform,config,console,job)
                time.sleep(.35 if status.get('port') else 1)
    finally:
        console.shutdown()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('config',help='Local workstation JSON')
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text(encoding='utf-8-sig'))
    config.setdefault('workdir',str(Path(os.getenv('LOCALAPPDATA',str(Path.home())))/'gitpolar'/'firmware'))
    serve(config,os.environ['GITPOLAR_STATION_KEY'])
