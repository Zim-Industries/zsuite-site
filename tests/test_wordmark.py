"""Verify the supplied logo assets actually encode finite one-shot playback."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class WordmarkTests(unittest.TestCase):
 def test_supplied_animations_play_once_and_have_frames(self):
  for name in ['zsuite-wordmark-anim.webp','zsuite-mark-anim.webp']:
   raw=(ROOT/'docs/assets/wordmark'/name).read_bytes()
   self.assertEqual(raw[:4],b'RIFF');self.assertEqual(raw[8:12],b'WEBP')
   i=12;loops=None;frames=0;duration=0
   while i+8<=len(raw):
    kind=raw[i:i+4];size=int.from_bytes(raw[i+4:i+8],'little');data=raw[i+8:i+8+size]
    self.assertEqual(len(data),size)
    if kind==b'ANIM':loops=int.from_bytes(data[4:6],'little')
    if kind==b'ANMF':frames+=1;duration+=int.from_bytes(data[12:15],'little')
    i+=8+size+size%2
   self.assertEqual(loops,1,name);self.assertGreater(frames,1);self.assertGreater(duration,2000)
 def test_only_header_uses_animated_assets(self):
  text=(ROOT/'docs/index.html').read_text()
  header=text.split('<header',1)[1].split('</header>',1)[0]
  self.assertIn('zsuite-wordmark-anim.webp',header);self.assertIn('zsuite-mark-anim.webp',header)
  self.assertIn('zsuite-wordmark.svg',header)
  footer=text.split('<footer',1)[1]
  self.assertNotIn('anim.webp',footer);self.assertIn('assets/logo-light.svg',footer)
if __name__=='__main__':unittest.main()
