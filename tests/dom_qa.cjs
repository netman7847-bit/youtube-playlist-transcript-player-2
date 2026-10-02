const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('assert/strict');
const base=require('path').join(__dirname,'../public/');
const dom=new JSDOM(fs.readFileSync(base+'index.html','utf8'),{url:'http://localhost:3000',runScripts:'outside-only'});const w=dom.window,d=w.document;
w.structuredClone=structuredClone;w.confirm=()=>true;let fetches=0;w.fetch=async url=>{fetches++;return {ok:true,json:async()=>({cues:[{start:1,duration:2,text:'Hello café'},{start:1800,duration:4,text:'Later'}],language:'English',generated:true})}};
w.eval(fs.readFileSync(base+'core.js','utf8'));w.eval(fs.readFileSync(base+'app.js','utf8'));
let events,loads=[];w.YT={PlayerState:{ENDED:0},Player:function(id,opts){events=opts.events;this.cueVideoById=id=>loads.push(['cue',id]);this.loadVideoById=id=>loads.push(['load',id]);this.stopVideo=()=>{};this.seekTo=()=>{};this.playVideo=()=>{}}};w.onYouTubeIframeAPIReady();events.onReady();
const click=id=>d.getElementById(id).click();const add=(id,name)=>{d.getElementById('url').value='https://youtu.be/'+id;d.getElementById('label').value=name;d.getElementById('addForm').dispatchEvent(new w.Event('submit',{cancelable:true}));};
(async()=>{add('dQw4w9WgXcQ','First');add('jNQXAC9IVRw','Second');add('aqz-KE-bpKQ','Third');assert.equal(d.querySelectorAll('.queue-item').length,3);assert.equal(fetches,0);
d.querySelector('[aria-label="Move Third up"]').click();assert.match(d.querySelectorAll('.queue-item')[1].textContent,/Third/);
// desktop drag events on actual handlers
let rows=d.querySelectorAll('.queue-item');rows[1].ondragstart({dataTransfer:{setData(){},effectAllowed:''}});rows[0].ondrop({preventDefault(){}});assert.match(d.querySelectorAll('.queue-item')[0].textContent,/Third/);assert.equal(fetches,0);
d.querySelector('.queue-item .video').click();click('generate');await new Promise(r=>setTimeout(r,0));assert.equal(fetches,1);assert.equal(d.querySelectorAll('.cue').length,2);assert.equal(d.querySelectorAll('.transcript h3').length,2);
d.getElementById('search').value='café';d.getElementById('search').oninput();assert.equal(d.querySelectorAll('.cue').length,1);d.getElementById('search').value='';d.getElementById('search').oninput();
d.querySelector('[aria-label="Move Third down"]').click();assert.equal(fetches,1);assert.equal(d.querySelectorAll('.cue').length,2);click('next');assert.equal(d.getElementById('now').textContent,'Second');assert.equal(d.querySelectorAll('.cue').length,0);click('previous');assert.equal(d.getElementById('now').textContent,'Third');assert.equal(d.querySelectorAll('.cue').length,2);
events.onStateChange({data:0});assert.equal(d.getElementById('now').textContent,'Second');assert.equal(fetches,1);
d.getElementById('playlistName').value='My test';click('save');const saved=JSON.parse(w.localStorage.getItem('yt-playlist-transcript-player:v1'));assert.equal(saved.saved['My test'].length,3);
d.getElementById('saved').value='My test';click('load');assert.equal(d.getElementById('now').textContent,'First');
d.querySelector('[aria-label="Remove First"]').click();assert.equal(d.querySelectorAll('.queue-item').length,2);assert.equal(d.getElementById('now').textContent,'Third');assert.equal(fetches,1);
// fresh DOM should restore queue and saved playlists
const fresh=new JSDOM(fs.readFileSync(base+'index.html','utf8'),{url:'http://localhost:3000',runScripts:'outside-only'});fresh.window.localStorage.setItem('yt-playlist-transcript-player:v1',w.localStorage.getItem('yt-playlist-transcript-player:v1'));fresh.window.eval(fs.readFileSync(base+'core.js','utf8'));fresh.window.eval(fs.readFileSync(base+'app.js','utf8'));assert.equal(fresh.window.document.querySelectorAll('.queue-item').length,2);assert.equal(fresh.window.document.getElementById('saved').options.length,2);
console.log('DOM integration passed: add/remove, drag handlers, up/down, selection stability, previous/next, automatic next, explicit-only transcript fetch, search, sections, per-video transcript display, saved playlist reload/load.');w.close();fresh.window.close();})().catch(e=>{console.error(e);process.exit(1)});
