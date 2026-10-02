(function(root){
'use strict';
function videoId(input){
 const value=input.trim(); if(/^[\w-]{11}$/.test(value))return value;
 let u;try{u=new URL(value);}catch{throw Error('Paste a valid YouTube URL.');}
 if(!['https:','http:'].includes(u.protocol))throw Error('Use an HTTP or HTTPS YouTube URL.');
 let id;
 if(['youtu.be','www.youtu.be'].includes(u.hostname))id=u.pathname.split('/')[1];
 else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(u.hostname))id=u.searchParams.get('v')||(/^\/(shorts|live|embed)\//.test(u.pathname)?u.pathname.split('/')[2]:null);
 if(!id||! /^[\w-]{11}$/.test(id))throw Error('This is not a YouTube video link.'); return id;
}
function move(items,from,to){const copy=[...items];if(from<0||to<0||from>=copy.length||to>=copy.length)return copy;const [item]=copy.splice(from,1);copy.splice(to,0,item);return copy;}
function timestamp(s){return new Date(Math.max(0,s)*1000).toISOString().slice(11,19);}
function parseSubtitles(text){
 const cues=[]; const blocks=text.replace(/^\uFEFF/,'').replace(/\r/g,'').split(/\n\s*\n/);
 const seconds=s=>{const p=s.replace(',','.').split(':').map(Number);return p.reduce((a,n)=>a*60+n,0);};
 for(const block of blocks){const lines=block.split('\n');const i=lines.findIndex(l=>l.includes('-->'));if(i<0)continue;
 const m=lines[i].match(/((?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3})/);if(!m)throw Error('Invalid subtitle timing.');
 const start=seconds(m[1]),end=seconds(m[2]);if(end<start)throw Error('Subtitle end precedes start.');
 const text=lines.slice(i+1).join(' ').replace(/<[^>]*>/g,'').trim();if(text)cues.push({start,duration:end-start,text});
 }if(!cues.length)throw Error('No timestamped cues found in this subtitle file.'); return cues.sort((a,b)=>a.start-b.start);
}
const api={videoId,move,timestamp,parseSubtitles};if(typeof module!=='undefined')module.exports=api;else root.Core=api;
})(typeof window!=='undefined'?window:globalThis);
