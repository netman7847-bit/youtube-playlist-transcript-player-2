(function(root,factory){if(typeof module==='object')module.exports=factory();else root.LiveBufferPolicy=factory();})(globalThis,()=>{
  class DelayPolicy{
    constructor({mode='auto',delay=12,maxDelay=60}={}){this.mode=mode;this.delay=delay;this.maxDelay=maxDelay;this.latencies=[];this.target=delay;}
    configure(mode,delay){this.mode=mode;this.delay=Math.min(this.maxDelay,Math.max(1,Number(delay)||12));if(mode==='manual')this.target=this.delay;}
    completed(seconds,span=8){this.latencies.push(Math.max(0,seconds));this.latencies=this.latencies.slice(-12);if(this.mode==='auto'){const sorted=[...this.latencies].sort((a,b)=>a-b);this.target=Math.min(this.maxDelay,Math.max(this.delay,span+sorted[Math.ceil(sorted.length*.9)-1]+2));}}
    decide({captured,bufferedEnd,playhead,readyThrough,inputEnded=false,userPaused=false}){
      const lag=Math.max(0,captured-playhead),target=this.mode==='auto'?this.target:this.delay;
      if(userPaused)return {play:false,reason:'Paused by you',lag,target};
      if(inputEnded&&playhead>=bufferedEnd-.005)return {play:false,reason:'Finished',lag,target};
      if(bufferedEnd-playhead<(inputEnded?.001:.15))return {play:false,reason:'Waiting for captured video and audio',lag,target};
      if(readyThrough<Math.min(bufferedEnd,playhead+.25))return {play:false,reason:'Waiting for captions — video and audio held together',lag,target};
      if(!inputEnded&&lag<target-.15)return {play:false,reason:'Filling selected playback delay',lag,target};
      return {play:true,reason:'Synchronized playback',lag,target};
    }
  }
  return {DelayPolicy};
});
