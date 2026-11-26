"""StandardRobot++ 串口接收与版本帧。帧格式与上位机 USB_Device.read_srpp 一致。"""
import base64
import math
import re
import struct
import time

IDENTITY = re.compile(rb'GITPOLAR/1 ((?:gitee|github)\.com/[\w.-]+/[\w.-]+) ([\w./-]+) ([0-9a-f]{40}) (dji|dm)(?: ([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}))?')

def checksum(data, bits):
    value = (1 << bits) - 1
    polynomial = 0x8c if bits == 8 else 0x8408
    for byte in data:
        value ^= byte
        for _ in range(8):
            value = (value >> 1) ^ (polynomial if value & 1 else 0)
    return value

def version_frame(source,build_id=None):
    line = 'GITPOLAR/1 {repository} {ref} {oid} {family}'.format(**source).encode('ascii')
    if build_id is not None:
        line += b' ' + build_id.encode('ascii')
    if len(line) > 255 or not IDENTITY.fullmatch(line):
        raise ValueError('Invalid board identity')
    header = bytes((0x5a, len(line), 0xf0))
    packet = header + bytes([checksum(header, 8)]) + line
    return packet + struct.pack('<H', checksum(packet, 16))

def identity(data):
    match = IDENTITY.fullmatch(data)
    if match:
        return {key:s.decode('ascii') for key,s in zip(('repository','ref','oid','family','buildId'),match.groups()) if s}
    return None

def finite(value):
    return value if math.isfinite(value) else None

def decode_frame(kind, payload):
    if kind == 0xf0:
        version = identity(payload)
        return {'type':'identity', **version} if version else None
    if len(payload) < 4:
        return None
    timestamp = struct.unpack_from('<I', payload)[0]
    if kind == 1 and (len(payload)-4) % 15 == 0:
        fields = {}
        for offset in range(4, len(payload), 15):
            name, scalar, value = struct.unpack_from('<10sB4s', payload, offset)
            name = name.rstrip(b'\0').decode('utf-8', errors='replace')
            if name and scalar in (0, 1):
                fields[name] = finite(struct.unpack('<I' if scalar == 0 else '<f',value)[0])
        return {'type':'debug','timestamp':timestamp,'values':fields}
    if kind == 2 and len(payload) >= 28:
        values = [finite(v) for v in struct.unpack_from('<6f',payload,4)]
        return {'type':'imu','timestamp':timestamp,'angles':values[:3],'rates':values[3:]}
    return {'type':'frame','id':kind,'timestamp':timestamp}

class Receiver:
    def __init__(self):
        self.pending = bytearray()
        self.version = None
        self.partial_line = bytearray()

    def _text(self, raw, events):
        self.partial_line.extend(raw)
        lines = self.partial_line.split(b'\n')
        self.partial_line = bytearray(lines.pop()[-512:])
        for line in lines:
            version = identity(line.rstrip(b'\r'))
            if version:
                events.append({'type':'identity', **version})

    def feed(self, raw):
        self.pending.extend(raw)
        events = []
        while self.pending:
            start = self.pending.find(b'\x5a')
            if start != 0:
                size = len(self.pending) if start < 0 else start
                self._text(self.pending[:size], events)
                del self.pending[:size]
                continue
            if len(self.pending) < 4:
                break
            if checksum(self.pending[:3],8) != self.pending[3]:
                self._text(self.pending[:1], events)
                del self.pending[:1]
                continue
            size = self.pending[1] + 6
            if len(self.pending) < size:
                break
            frame = self.pending[:size]
            if checksum(frame[:-2],16) != int.from_bytes(frame[-2:],'little'):
                del self.pending[:1]
                self.partial_line.clear()
                continue
            del self.pending[:size]
            self.partial_line.clear()
            event = decode_frame(frame[2],bytes(frame[4:-2]))
            if event:
                events.append(event)
        for event in events:
            if event['type'] == 'identity':
                self.version = {k:v for k,v in event.items() if k != 'type'}
                self.version['observedAt'] = int(time.time()*1000)
        return {'at':int(time.time()*1000),'raw':base64.b64encode(raw).decode('ascii'),'events':events}
