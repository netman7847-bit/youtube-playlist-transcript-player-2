"""Run against a local server at http://127.0.0.1:3000. External YouTube is mocked."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

MOCK='''window.YT={PlayerState:{ENDED:0},Player:function(id,opts){window.playerEvents=opts.events;window.playCalls=[];this.cueVideoById=id=>window.playCalls.push(['cue',id]);this.loadVideoById=id=>window.playCalls.push(['load',id]);this.stopVideo=()=>window.playCalls.push(['stop']);this.seekTo=s=>window.playCalls.push(['seek',s]);this.playVideo=()=>{};setTimeout(()=>opts.events.onReady(),10);}};window.onYouTubeIframeAPIReady();'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox']); context=browser.new_context();page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('https://www.youtube.com/iframe_api',lambda r:r.fulfill(content_type='application/javascript',body=MOCK))
 fetches=[]
 def transcript(route):
  fetches.append(route.request.url);route.fulfill(content_type='application/json',body=json.dumps({'cues':[{'start':1,'duration':2,'text':'Hello & café'},{'start':1800,'duration':4,'text':'Another segment'}],'generated':True,'language':'English'}))
 page.route('**/api/transcript/**',transcript)
 page.goto('http://127.0.0.1:3000')
 for ident,name in [('dQw4w9WgXcQ','First'),('jNQXAC9IVRw','Second'),('aqz-KE-bpKQ','Third')]:
  page.locator('#url').fill('https://youtu.be/'+ident);page.locator('#label').fill(name);page.get_by_role('button',name='Add video',exact=True).click()
 assert len(fetches)==0
 assert page.locator('.queue-item').count()==3
 page.get_by_role('button',name='Move Third up',exact=True).click();assert 'Third' in page.locator('.queue-item').nth(1).inner_text()
 page.locator('.queue-item').nth(1).drag_to(page.locator('.queue-item').nth(0));assert 'Third' in page.locator('.queue-item').nth(0).inner_text()
 assert len(fetches)==0
 page.get_by_role('button',name='1. Third aqz-KE-bpKQ').click();page.wait_for_timeout(100)
 page.get_by_role('button',name='Generate transcript',exact=True).click();page.wait_for_function("document.querySelectorAll('.cue').length===2")
 assert len(fetches)==1
 page.locator('#search').fill('café');assert page.locator('.cue').count()==1
 page.locator('#search').fill('');assert page.locator('.transcript h3').count()==2
 page.get_by_role('button',name='Move Third down',exact=True).click();assert len(fetches)==1;assert page.locator('.cue').count()==2
 page.get_by_role('button',name='Next',exact=True).click();assert page.locator('#now').inner_text()=='Second';assert page.locator('.cue').count()==0
 page.get_by_role('button',name='Previous',exact=True).click();assert page.locator('#now').inner_text()=='Third';assert page.locator('.cue').count()==2
 page.evaluate('window.playerEvents.onStateChange({data:0})');assert page.locator('#now').inner_text()=='Second';assert len(fetches)==1
 page.locator('#playlistName').fill('My test playlist');page.get_by_role('button',name='Save',exact=True).click();page.reload();assert page.locator('.queue-item').count()==3
 page.locator('#saved').select_option('My test playlist');page.get_by_role('button',name='Load',exact=True).click();assert page.locator('#now').inner_text()=='First'
 page.locator('#subtitles').set_input_files({'name':'sample.srt','mimeType':'text/plain','buffer':b'1\n00:00:01,000 --> 00:00:03,000\nImported subtitle\n'});assert page.locator('.cue').count()==1
 for fmt in ['TXT','MD','DOCX','PDF','CSV','SRT','VTT']:
  page.locator('#format').select_option(label=fmt)
  with page.expect_download() as d:page.get_by_role('button',name='Export full transcript',exact=True).click()
  assert d.value.suggested_filename.endswith('.'+fmt.lower())
 page.get_by_role('button',name='Remove First',exact=True).click();assert page.locator('.queue-item').count()==2
 for width in [390,768,1440]:
  page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),f'Overflow at {width}'
 page.screenshot(path='/tmp/playlist-player-desktop.png',full_page=True)
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path='/tmp/playlist-player-mobile.png',full_page=True)
 assert not errors,errors
 assert page.evaluate("'serviceWorker' in navigator")
 print('Browser QA passed: add/remove, desktop drag, mobile reorder, selection, previous/next, ended auto-next, transcript isolation, search, segments, save/reload/load, subtitle import, seven downloads, 390/768/1440 layout, no JavaScript errors.')
 browser.close()
