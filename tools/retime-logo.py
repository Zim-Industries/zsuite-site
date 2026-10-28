"""Retime supplied animated WebP frame durations without decoding/re-encoding pixels."""
import argparse, hashlib, json, zipfile
from pathlib import Path

def retime(raw, speed):
 assert raw[:4]==b'RIFF' and raw[8:12]==b'WEBP'
 out=bytearray(raw);i=12;before=0;after=0;frames=0;pixels=hashlib.sha256()
 while i+8<=len(raw):
  tag=raw[i:i+4];n=int.from_bytes(raw[i+4:i+8],'little');assert i+8+n<=len(raw)
  if tag==b'ANIM':assert int.from_bytes(raw[i+12:i+14],'little')==1,'Must remain one-shot'
  if tag==b'ANMF':
   duration=int.from_bytes(raw[i+20:i+23],'little');before+=duration
   target=round(before/speed);new_duration=target-after;assert 0<new_duration<2**24
   out[i+20:i+23]=new_duration.to_bytes(3,'little');after=target;frames+=1
   pixels.update(raw[i+24:i+8+n])
  i+=8+n+n%2
 return bytes(out),{'frames':frames,'original_ms':before,'retimed_ms':after,'speed':speed,'frame_payload_sha256':pixels.hexdigest()}

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('archive',type=Path);p.add_argument('--speed',type=float,default=1.5);a=p.parse_args();assert a.speed>0
 dest=Path(__file__).resolve().parents[1]/'docs/assets/wordmark';report={}
 with zipfile.ZipFile(a.archive)as z:
  for name in ['zsuite-wordmark-anim.webp','zsuite-mark-anim.webp']:
   out,info=retime(z.read(name),a.speed);(dest/name).write_bytes(out);report[name]=info
 print(json.dumps(report,indent=2))
