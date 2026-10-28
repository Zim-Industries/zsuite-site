"""Publication contract for the static, marketing-only Pages site."""
import unittest
import re
from html import unescape
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
ROOT=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
 def __init__(self,text):
  super().__init__();self.ids=[];self.links=[];self.images=[];self.meta={};self.tags=[];self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);self.tags.append(tag)
  if 'id'in a:self.ids.append(a['id'])
  if tag=='a':self.links.append(a.get('href',''))
  if tag=='img':self.images.append(a)
  if tag=='meta':self.meta[a.get('name','')]=a.get('content','')
class SiteTests(unittest.TestCase):
 def test_reviewable_marketing_page_and_download_are_present(self):
  f=ROOT/'docs/index.html';self.assertTrue(f.is_file(),'Marketing landing page must exist')
  p=Page(f.read_text());self.assertEqual(p.tags.count('h1'),1);self.assertIn('main',p.tags)
  self.assertIn('downloads/Z-Suite_Capabilities_and_Roadmap.pdf',p.links)
  self.assertTrue((ROOT/'docs/downloads/Z-Suite_Capabilities_and_Roadmap.pdf').is_file())
 def test_local_links_and_public_assets_resolve(self):
  p=Page((ROOT/'docs/index.html').read_text())
  self.assertEqual(len(p.ids),len(set(p.ids)))
  for link in p.links:
   parsed=urlsplit(link)
   if parsed.scheme or parsed.netloc:continue
   if parsed.fragment:self.assertIn(parsed.fragment,p.ids)
   if parsed.path:self.assertTrue((ROOT/'docs'/unquote(parsed.path)).is_file(),link)
  for image in p.images:
   self.assertIn('alt',image)
   self.assertTrue((ROOT/'docs'/image['src']).is_file(),image['src'])
  self.assertTrue((ROOT/'docs/assets/social-card.png').is_file(),'Social sharing image must exist')
 def test_internal_preview_does_not_collect_leads_or_expose_private_endpoints(self):
  text=(ROOT/'docs/index.html').read_text();p=Page(text)
  self.assertEqual(p.meta.get('robots'),'noindex, nofollow')
  self.assertNotIn('form',p.tags);self.assertNotIn('input',p.tags)
  for forbidden in ['staging.zsuite','paperclip','192.168.','mailto:','calendly','ZSU-','github.com/Zim-Industries/zsuite/blob']:
   self.assertNotIn(forbidden,text)
  self.assertIn('No roadmap dates are committed.',text)
 def test_five_lazy_showcase_chapters_preserve_workflow_mapping(self):
  text=(ROOT/'docs/index.html').read_text()
  self.assertEqual(text.count('data-chapter='),5)
  self.assertEqual(text.count('<video '),5)
  headlines={'time':'From the first punch to payroll handoff.','people':'A plan the crew can work from.','equipment':'More than an asset list.','field-records':'Capture the work. Keep the evidence.','safety':'Safety conversations. Recorded context.'}
  for name,heading in headlines.items():
   match=re.search(r'data-chapter="'+re.escape(name)+r'".*?<h3>(.*?)</h3>',text,re.S)
   if match is None:self.fail(f'Missing chapter heading: {name}')
   self.assertEqual(' '.join(unescape(re.sub(r'<[^>]*>',' ',match.group(1))).split()),heading)
  for name in ['time','people','equipment','field-records','safety']:
   self.assertIn(f'data-src="assets/showcase/{name}.mp4"',text)
   self.assertIn(f'data-poster="assets/showcase/{name}.webp"',text)
   self.assertTrue((ROOT/f'docs/assets/showcase/{name}.mp4').is_file())
   self.assertTrue((ROOT/f'docs/assets/showcase/{name}.webp').is_file())
  media=ROOT/'docs/assets/showcase'
  self.assertEqual(len(list(media.glob('*.mp4'))),5)
  self.assertLess(sum(p.stat().st_size for p in media.iterdir()),25*1024*1024)
  for file in ['index.html','styles.css','site.js','showcase.js']:
   source=(ROOT/'docs'/file).read_text()
   self.assertNotIn('<<<<<<<',source);self.assertNotIn('>>>>>>>',source)
  self.assertNotIn(' autoplay',text)
  self.assertIn('showcase.js',text)
 def test_completed_jsa_work_is_described_as_delivered_not_future_scope(self):
  text=(ROOT/'docs/index.html').read_text()
  for delivered in ['project bundles of up to 31 days','Daily JSA checks','NWS','AirNow']:
   self.assertIn(delivered,text)
  for stale in ['daily-JSA program is partially delivered and remains in review','Dependent JSA asset/conditions follow-ups']:
   self.assertNotIn(stale,text)
  self.assertIn('native/offline foundations',text)
  self.assertIn('optional Microsoft sign-in',text)
 def test_product_presentation_is_not_a_purchase_evaluation(self):
  text=(ROOT/'docs/index.html').read_text()
  for phrase in ['Buy for the work you do','Not a roadmap promise','A strong fit to evaluate','purchase decisions','commercial scope','support terms','You want','You need','Is it a fit?']:
   self.assertNotIn(phrase,text)
  for phrase in ['What the platform does today.','Where it goes next.','Product scope','Internal product presentation']:
   self.assertIn(phrase,text)
 def test_copy_names_workflows_instead_of_generic_sales_slogans(self):
  text=(ROOT/'docs/index.html').read_text()
  self.assertNotIn('\u2014',text);self.assertNotIn('\u2013',text)
  for stale in ['Explore Z-Suite','A better-connected','Not just submitted','The connection <span','seamless','revolutionary','cutting-edge']:
   self.assertNotIn(stale,text)
  for concrete in ['View capabilities','From the first punch','More than an <br>asset list.','Safety conversations.','EQUIPMENT BOOKINGS','does not transfer funds','require whole-company JSA read or manage access','manual entry remains available','Delivery dates for planned work are not set.']:
   self.assertIn(concrete,text)
if __name__=='__main__':unittest.main()
