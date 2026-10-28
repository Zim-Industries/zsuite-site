"""Unlisted overview-video page: self-contained, resolvable, not linked from the landing page."""
import unittest
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'docs/video/index.html'
class Refs(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.refs = []; self.meta = {}; self.tags = []; self.feed(text)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs); self.tags.append(tag)
        for k in ('href', 'src', 'poster'):
            if a.get(k): self.refs.append(a[k])
        if tag == 'meta': self.meta[a.get('name', '')] = a.get('content', '')
class VideoPageTests(unittest.TestCase):
    def test_page_assets_resolve(self):
        p = Refs(PAGE.read_text())
        self.assertEqual(p.tags.count('h1'), 1); self.assertIn('video', p.tags)
        for ref in p.refs:
            u = urlsplit(ref)
            if u.scheme or u.netloc or not u.path: continue
            self.assertTrue((PAGE.parent / unquote(u.path)).resolve().is_file(), ref)
    def test_video_is_web_ready_mp4(self):
        data = (ROOT / 'docs/video/zsuite-overview.mp4').read_bytes()
        self.assertEqual(data[4:8], b'ftyp')
        self.assertLess(data.find(b'moov'), data.find(b'mdat'), 'moov atom must precede mdat (faststart)')
        self.assertLess(len(data), 95 * 1024 * 1024, 'GitHub rejects files over 100 MB')
    def test_unlisted_and_not_indexed(self):
        self.assertEqual(Refs(PAGE.read_text()).meta.get('robots'), 'noindex, nofollow')
        self.assertNotIn('video/', (ROOT / 'docs/index.html').read_text())
        text = PAGE.read_text()
        for forbidden in ['staging.zsuite', 'paperclip', '192.168.', 'mailto:']:
            self.assertNotIn(forbidden, text)
if __name__ == '__main__': unittest.main()
