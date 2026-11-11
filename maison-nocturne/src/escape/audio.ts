export class MuseumAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private volume=0;
  private ambience?: OscillatorNode;
  setVolume(value:number){
    this.volume=value;
    if(value>0&&!this.context){
      this.context=new AudioContext();this.master=this.context.createGain();this.master.connect(this.context.destination);
      this.ambience=this.context.createOscillator();this.ambience.type='sine';this.ambience.frequency.value=110;
      const g=this.context.createGain();g.gain.value=.025;this.ambience.connect(g);g.connect(this.master);this.ambience.start();
    }
    if(this.master&&this.context){this.master.gain.setTargetAtTime(value,this.context.currentTime,.15);if(value>0)void this.context.resume();}
  }
  tone(kind:'paper'|'lock'|'step'|'success'){
    if(!this.context||!this.master||!this.volume)return;
    const ctx=this.context,g=ctx.createGain(),o=ctx.createOscillator(),t=ctx.currentTime;
    o.type=kind==='step'?'triangle':'sine';o.frequency.setValueAtTime({paper:900,lock:210,step:65,success:523}[kind],t);
    o.frequency.exponentialRampToValueAtTime(kind==='success'?784:45,t+.15);g.gain.setValueAtTime(kind==='step'?.035:.09,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);
    o.connect(g);g.connect(this.master);o.start();o.stop(t+.26);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  suspend(){void this.context?.suspend();}
  resume(){if(this.volume)void this.context?.resume();}
}
