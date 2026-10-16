/* Delays one muxed A/V stream. Caption readiness gates output; no subtitle-only delay. */
(function(root){
  const {DelayPolicy}=root.LiveBufferPolicy;
  class BufferedPlayback{
    static codec(){if(!root.MediaSource||!root.MediaRecorder)return null;return ['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus'].find(t=>MediaSource.isTypeSupported(t)&&MediaRecorder.isTypeSupported(t))||null;}
    constructor({output,recognize,onCue,onStatus,onLevel,onError,onEnded,onCaptureStart,mode='auto',delay=12,chunkSeconds=8}){
      Object.assign(this,{output,recognize,onCue,onStatus,onLevel,onError,onEnded,onCaptureStart,chunkSeconds});this.policy=new DelayPolicy({mode,delay});this.abort=new AbortController();this.pending=[];this.audioJobs=[];this.audio=[];this.sampleCount=0;this.readyThrough=0;this.captured=0;this.bytes=0;this.userPaused=false;this.disposed=false;this.ignorePause=0;this.inputEnded=false;this.mediaFinished=false;this.started=false;this.playPending=false;this.flushing=false;this.offset=0;
      this.onPause=()=>{if(this.ignorePause){this.ignorePause--;return;}if(this.started&&!this.disposed&&!this.output.ended)this.userPaused=true;};this.onPlay=()=>{this.userPaused=false;};this.onMediaError=()=>this.fail(Error('Buffered video decoder failed: '+(this.output.error?.message||'unsupported A/V stream')));
    }
    async start(stream){
      const mime=BufferedPlayback.codec();if(!mime)throw Error('Synchronized buffering requires a browser supporting MediaRecorder and MediaSource with WebM A/V (try desktop Edge or Chrome).');
      if(!stream.getVideoTracks().length||!stream.getAudioTracks().length)throw Error('Buffering needs both video and audio from the same source.');
      this.stream=stream;this.ms=new MediaSource();this.url=URL.createObjectURL(this.ms);this.output.src=this.url;this.output.controls=true;this.output.addEventListener('pause',this.onPause);this.output.addEventListener('play',this.onPlay);this.output.addEventListener('error',this.onMediaError);
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Buffered video could not open.')),10000);this.ms.addEventListener('sourceopen',()=>{clearTimeout(timer);if(this.disposed)return reject(Error('Buffer start cancelled.'));try{this.sb=this.ms.addSourceBuffer(mime);this.sb.addEventListener('updateend',()=>this.pump());this.sb.addEventListener('error',()=>this.fail(Error('The browser could not decode the buffered A/V stream.')));resolve();}catch(e){reject(e);}},{once:true});this.abort.signal.addEventListener('abort',()=>{clearTimeout(timer);reject(Error('Buffer start cancelled.'));},{once:true});});
      if(this.disposed)throw Error('Buffer start cancelled.');
      const ctx=this.ctx=new AudioContext({sampleRate:16000});await ctx.resume();if(this.disposed){await ctx.close();throw Error('Buffer start cancelled.');}
      this.source=ctx.createMediaStreamSource(stream);this.proc=ctx.createScriptProcessor(1024,1,1);this.mute=ctx.createGain();this.mute.gain.value=0;
      this.proc.onaudioprocess=e=>{if(this.disposed||this.inputEnded)return;const input=e.inputBuffer.getChannelData(0);let sum=0;for(const x of input)sum+=x*x;this.onLevel?.(Math.min(1,Math.sqrt(sum/input.length)*4));const samples=this.resample(input,ctx.sampleRate);this.audio.push(...samples);this.sampleCount+=samples.length;this.captured=this.sampleCount/16000;while(this.audio.length>=this.chunkSeconds*16000){const a=new Float32Array(this.audio.splice(0,this.chunkSeconds*16000));this.queueAudio(a);}if(this.captured-this.output.currentTime>120)this.fail(Error('Buffer exceeded 120 seconds. Stop or use a faster caption engine; no content was silently skipped.'));};
      this.recordDest=ctx.createMediaStreamDestination();this.source.connect(this.recordDest);this.muxStream=new MediaStream([...stream.getVideoTracks(),...this.recordDest.stream.getAudioTracks()]);
      this.recorder=new MediaRecorder(this.muxStream,{mimeType:mime,videoBitsPerSecond:2500000,audioBitsPerSecond:96000,videoKeyFrameIntervalDuration:1000});
      this.recorder.ondataavailable=e=>{if(this.disposed||!e.data.size)return;this.bytes+=e.data.size;if(this.bytes>64*1024*1024)return this.fail(Error('Buffered media exceeded the 64 MB queue limit.'));this.pending.push(e.data);this.pump();};
      this.recorder.onerror=e=>this.fail(Error('A/V capture failed: '+(e.error?.message||'MediaRecorder error')));
      this.recorder.onstop=()=>{this.recorderStopped=true;if(!this.disposed&&!this.finishing&&!this.inputEnded)this.finishInput();this.pump();};
      this.source.connect(this.proc);this.proc.connect(this.mute);this.mute.connect(ctx.destination);this.onCaptureStart?.();this.recorder.start(500);this.started=true;
      for(const track of stream.getTracks())track.addEventListener('ended',()=>{if(!this.disposed)this.finishInput();},{once:true});
      this.timer=setInterval(()=>this.tick(),100);this.tick();
    }
    resample(input,rate){if(rate===16000)return input;const data=[...(this.resampleTail||[]),...input],out=[],step=rate/16000;let at=this.resamplePhase||0;while(at+1<data.length){const j=Math.floor(at),f=at-j;out.push(data[j]+(data[j+1]-data[j])*f);at+=step;}const used=Math.min(data.length,Math.floor(at));this.resampleTail=data.slice(used);this.resamplePhase=at-used;return new Float32Array(out);}
    queueAudio(samples){const start=this.queuedEnd||0,end=start+samples.length/16000;this.queuedEnd=end;this.audioJobs.push({samples,start,end});if(this.audioJobs.length>6)return this.fail(Error('Recognition cannot keep up with incoming audio. Buffered playback stopped rather than dropping speech.'));this.drainAudio();}
    async drainAudio(){if(this.recognizing||this.disposed)return;this.recognizing=true;try{while(this.audioJobs.length&&!this.disposed){const job=this.audioJobs.shift(),began=performance.now();const result=await this.recognize(job.samples,this.abort.signal);if(this.disposed)return;const elapsed=(performance.now()-began)/1000;this.policy.completed(elapsed,job.end-job.start);
          const segments=result.segments?.length?result.segments:[{start:0,end:job.end-job.start,text:result.text||''}];
          for(const cue of segments){if(!cue.text?.trim())continue;const start=Math.max(job.start,job.start+(Number(cue.start)||0)),end=Math.min(job.end,job.start+(Number(cue.end)||job.end-job.start));if(end>start)this.onCue?.({start,end,text:cue.text.trim(),language:result.language||'',speaker:cue.speaker||''});}
          // Only acknowledged audio advances readiness, including speech-free blocks.
          this.readyThrough=job.end;this.lastProcessing=elapsed;this.tick();
        }}catch(e){if(!this.disposed)this.fail(Error('Buffered recognition failed: '+e.message));}finally{this.recognizing=false;this.tick();}}
    async pump(){if(this.disposed||!this.sb||this.sb.updating||this.appending)return;
      const cut=this.output.currentTime-5;if(cut>0&&this.sb.buffered.length&&this.sb.buffered.start(0)<cut-.5){try{this.sb.remove(0,cut);return;}catch(e){return this.fail(e);}}
      if(!this.pending.length){if(this.recorderStopped&&this.ms.readyState==='open'&&!this.mediaFinished){try{this.ms.endOfStream();this.mediaFinished=true;}catch(e){this.fail(e);}}return;}
      this.appending=true;const blob=this.pending.shift();try{const data=await blob.arrayBuffer();if(this.disposed)return;this.bytes-=blob.size;this.sb.appendBuffer(data);}catch(e){this.fail(Error('Could not append buffered video: '+e.message));}finally{this.appending=false;}}
    pauseForPolicy(){if(!this.output.paused){this.ignorePause++;this.output.pause();}}
    tick(){if(this.disposed||!this.sb||this.completed)return;const ranges=this.output.buffered;let end=ranges.length?ranges.end(ranges.length-1):0;const decision=this.policy.decide({captured:this.captured,bufferedEnd:end,playhead:this.output.currentTime,readyThrough:this.finalReady(end),inputEnded:this.inputEnded&&this.mediaFinished,userPaused:this.userPaused});this.onStatus?.({...decision,captured:this.captured,readyThrough:this.readyThrough,playhead:this.output.currentTime,processing:this.lastProcessing||0,inputEnded:this.inputEnded});
      if(decision.play){if(this.output.paused&&!this.playPending){this.playPending=true;this.output.play().catch(()=>{this.userPaused=true;this.onStatus?.({...decision,reason:'Click Resume delayed playback to allow audio.',play:false});}).finally(()=>{this.playPending=false;});}}
      else this.pauseForPolicy();
      // Natural end waits for outstanding recognition, so the final audio block is not dropped.
      if(this.inputEnded&&this.mediaFinished&&!this.recognizing&&!this.audioJobs.length&&end>0&&(this.output.ended||this.output.currentTime>=end-.008)&&!this.completed){this.completed=true;this.onEnded?.();}
    }
    finalReady(end){return this.inputEnded&&this.mediaFinished&&!this.recognizing&&!this.audioJobs.length&&end-this.readyThrough<.5?Math.max(end,this.readyThrough):this.readyThrough;}
    configure(mode,delay){this.policy.configure(mode,delay);this.tick();}
    resume(){this.userPaused=false;this.tick();if(this.output.paused){const r=this.policy.decide({captured:this.captured,bufferedEnd:this.output.buffered.length?this.output.buffered.end(this.output.buffered.length-1):0,playhead:this.output.currentTime,readyThrough:this.finalReady(this.output.buffered.length?this.output.buffered.end(this.output.buffered.length-1):0),inputEnded:this.inputEnded&&this.mediaFinished,userPaused:false});if(r.play)this.output.play().catch(e=>this.fail(e));}}
    pause(){this.userPaused=true;this.pauseForPolicy();}
    finishInput(){if(this.disposed||this.inputEnded)return;this.finishing=true;if(this.audio.length)this.queueAudio(new Float32Array(this.audio.splice(0)));this.inputEnded=true;this.finishing=false;if(this.recorder?.state!=='inactive')this.recorder.stop();this.onLevel?.(0);this.tick();}
    fail(error){if(this.disposed)return;this.dispose();this.onError?.(error);}
    dispose(){if(this.disposed)return;this.disposed=true;clearInterval(this.timer);clearTimeout(this.finishTimer);this.abort.abort();this.output.removeEventListener('pause',this.onPause);this.output.removeEventListener('play',this.onPlay);this.output.removeEventListener('error',this.onMediaError);this.output.pause();if(this.recorder&&this.recorder.state!=='inactive')this.recorder.stop();if(this.proc)this.proc.onaudioprocess=null;for(const node of [this.source,this.proc,this.mute])try{node?.disconnect();}catch{}this.ctx?.close().catch(()=>{});this.muxStream?.getTracks().forEach(t=>t.stop());this.stream?.getTracks().forEach(t=>t.stop());this.output.removeAttribute('src');this.output.load();if(this.url)URL.revokeObjectURL(this.url);this.pending=[];this.audioJobs=[];this.audio=[];}
  }
  root.BufferedPlayback=BufferedPlayback;
})(globalThis);
