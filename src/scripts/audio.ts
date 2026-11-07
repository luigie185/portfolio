/**
 * Forest soundscape — everything is synthesized live with the Web Audio API
 * (no sample files):
 *   • weather ambience: filtered-noise beds (rain, wind, rumble, hush) plus
 *     little events (rain droplets, thunder, birdsong by day, crickets at night,
 *     wind chimes in snow and mist), cross-faded when the weather changes;
 *   • background music: an original, procedurally composed pastoral piece —
 *     a warm chord loop on a soft pad, a gentle bass and a music-box melody that
 *     wanders a pentatonic scale, scheduled ahead on the audio clock.
 *
 * Browsers only allow sound after a user gesture, so nothing plays until
 * start() is called from a click/key press. A separate mute flag is kept
 * (rather than relying on context suspension) so muting is always respected.
 */
import { read, write } from './storage';

type Weather =
  | 'clear' | 'rain' | 'storm' | 'mist' | 'snow' | 'breeze'
  | 'sakura' | 'haze' | 'sunshower' | 'drizzle' | 'heat' | 'typhoon' | 'momiji' | 'blizzard';
type Bed = 'rain' | 'wind' | 'rumble' | 'hush';

const BED_LEVELS: Record<Weather, Record<Bed, number>> = {
  clear: { rain: 0, wind: 0.3, rumble: 0, hush: 0 },
  sakura: { rain: 0, wind: 0.45, rumble: 0, hush: 0 },
  haze: { rain: 0, wind: 0.12, rumble: 0, hush: 0.25 },
  sunshower: { rain: 0.06, wind: 0.15, rumble: 0, hush: 0 },
  drizzle: { rain: 0.05, wind: 0.08, rumble: 0, hush: 0.15 },
  rain: { rain: 0.09, wind: 0.1, rumble: 0, hush: 0 },
  mist: { rain: 0, wind: 0.1, rumble: 0, hush: 0.35 },
  heat: { rain: 0, wind: 0.08, rumble: 0, hush: 0 },
  storm: { rain: 0.16, wind: 0.35, rumble: 0.28, hush: 0 },
  breeze: { rain: 0, wind: 1.1, rumble: 0, hush: 0 },
  typhoon: { rain: 0.2, wind: 1.3, rumble: 0.2, hush: 0 },
  momiji: { rain: 0, wind: 0.5, rumble: 0, hush: 0 },
  snow: { rain: 0, wind: 0.2, rumble: 0, hush: 0.4 },
  blizzard: { rain: 0, wind: 1.2, rumble: 0, hush: 0.45 },
};

// --- music material (original) ------------------------------------------
// Chords as MIDI notes. A slow, warm loop in F major.
const CHORDS: number[][] = [
  [53, 57, 60, 64], // Fmaj7
  [50, 53, 57, 60], // Dm7
  [46, 50, 53, 57], // Bbmaj7
  [48, 52, 55, 60], // C
  [53, 57, 60, 64], // Fmaj7
  [45, 48, 52, 55], // Am7
  [46, 50, 53, 57], // Bbmaj7
  [48, 53, 55, 60], // Csus4
];
// F major pentatonic (F G A C D) over two octaves for the melody
const SCALE = [65, 67, 69, 72, 74, 77, 79, 81, 84];
// Sparse, unhurried rhythms (beats within a bar) — lots of space between notes
const RHYTHMS: number[][] = [
  [0, 2],
  [0, 3],
  [0, 1.5, 3],
  [1, 3],
  [0],
  [0, 2.5],
];

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

class ForestAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private ambBus!: GainNode;
  private reverb!: ConvolverNode;
  private reverbSend!: GainNode;
  private beds = {} as Record<Bed, GainNode>;
  private white!: AudioBuffer;
  private brown!: AudioBuffer;

  private weather: Weather = 'clear';
  private night = false;
  private enabled = read('sound') !== 'off';
  private musicVol = Number(read('vol-music') ?? 0.5);
  private ambVol = Number(read('vol-amb') ?? 0.7);

  // music scheduler state
  private nextBeat = 0;
  private beat = 0;
  private melodyDegree = 4;
  private motif: { t: number; deg: number }[] = [];
  private schedTimer: number | undefined;
  private eventTimer: number | undefined;
  private nextThunder = 0;

  get supported() {
    return typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
  }
  isEnabled() {
    return this.enabled;
  }
  get volumes() {
    return { music: this.musicVol, ambience: this.ambVol };
  }

  /** Call from a user gesture. Safe to call repeatedly. */
  start() {
    if (!this.supported || !this.enabled) return;
    if (!this.ctx) this.build();
    if (this.ctx!.state !== 'running') this.ctx!.resume().catch(() => {});
    this.fadeMaster(1, 1.5);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    write('sound', on ? 'on' : 'off');
    if (on) this.start();
    else if (this.ctx) {
      this.fadeMaster(0, 0.4);
      window.setTimeout(() => !this.enabled && this.ctx?.suspend(), 500);
    }
  }

  setVolumes(music: number, ambience: number) {
    this.musicVol = music;
    this.ambVol = ambience;
    write('vol-music', String(music));
    write('vol-amb', String(ambience));
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(this.musicLevel(), t, 0.1);
    this.ambBus.gain.setTargetAtTime(this.ambVol, t, 0.1);
  }

  setWeather(w: string) {
    this.weather = (w in BED_LEVELS ? w : 'clear') as Weather;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    (Object.keys(this.beds) as Bed[]).forEach((b) => this.beds[b].gain.setTargetAtTime(BED_LEVELS[this.weather][b], t, 1.2));
    this.musicBus.gain.setTargetAtTime(this.musicLevel(), t, 1.5);
    this.nextThunder = t + rand(2, 5);
  }

  setNight(isNight: boolean) {
    this.night = isNight;
  }

  /** Pause rendering while the tab is hidden (saves battery), resume after. */
  setPageVisible(visible: boolean) {
    if (!this.ctx || !this.enabled) return;
    if (visible) this.ctx.resume().catch(() => {});
    else this.ctx.suspend().catch(() => {});
  }

  // ------------------------------------------------------------------ graph

  private build() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = (this.ctx = new AC({ latencyHint: 'playback' }));

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(comp).connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(4, 2.4);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.7;
    this.reverbSend.connect(this.reverb).connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicLevel();
    this.musicBus.connect(this.master);
    this.musicBus.connect(this.reverbSend);

    this.ambBus = ctx.createGain();
    this.ambBus.gain.value = this.ambVol;
    this.ambBus.connect(this.master);

    this.white = this.noise('white');
    this.brown = this.noise('brown');
    this.buildBeds();
    this.setWeather(this.weather);

    this.nextBeat = ctx.currentTime + 0.2;
    this.schedTimer = window.setInterval(() => this.scheduleMusic(), 50);
    this.eventTimer = window.setInterval(() => this.scheduleEvents(), 200);
  }

  private noise(kind: 'white' | 'brown') {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === 'white') d[i] = w;
        else {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        }
      }
    }
    return buf;
  }

  private impulse(seconds: number, decay: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  private loop(buf: AudioBuffer) {
    const src = this.ctx!.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.loopStart = 0;
    src.loopEnd = buf.duration;
    src.start(0, Math.random() * buf.duration);
    return src;
  }

  private buildBeds() {
    const ctx = this.ctx!;
    const mk = (name: Bed, chain: AudioNode[], src: AudioBufferSourceNode) => {
      const g = ctx.createGain();
      g.gain.value = 0;
      let node: AudioNode = src;
      for (const n of chain) node = node.connect(n);
      node.connect(g).connect(this.ambBus);
      this.beds[name] = g;
    };
    const filt = (type: BiquadFilterType, f: number, q = 0.7) => {
      const b = ctx.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      return b;
    };

    // rain: bright hiss
    mk('rain', [filt('highpass', 450), filt('lowpass', 6500)], this.loop(this.white));

    // wind: band-passed noise whose pitch and loudness slowly swell
    const windBand = filt('bandpass', 520, 0.9);
    const windAmp = ctx.createGain();
    windAmp.gain.value = 0.7;
    const lfoF = ctx.createOscillator();
    lfoF.frequency.value = 0.07;
    const lfoFAmt = ctx.createGain();
    lfoFAmt.gain.value = 260;
    lfoF.connect(lfoFAmt).connect(windBand.frequency);
    const lfoA = ctx.createOscillator();
    lfoA.frequency.value = 0.11;
    const lfoAAmt = ctx.createGain();
    lfoAAmt.gain.value = 0.3;
    lfoA.connect(lfoAAmt).connect(windAmp.gain);
    lfoF.start();
    lfoA.start();
    mk('wind', [windBand, windAmp], this.loop(this.brown));

    // rumble: distant low thunder bed
    mk('rumble', [filt('lowpass', 140)], this.loop(this.brown));

    // hush: soft, muffled air (mist, snow)
    mk('hush', [filt('lowpass', 700), filt('highpass', 120)], this.loop(this.white));
  }

  private musicLevel() {
    const w = this.weather;
    const duck = w === 'storm' || w === 'typhoon' || w === 'blizzard' ? 0.45 : w === 'rain' ? 0.8 : 1;
    return this.musicVol * 0.55 * duck;
  }

  private fadeMaster(to: number, secs: number) {
    if (!this.ctx) return;
    const g = this.master.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(to, t + secs);
  }

  // ------------------------------------------------------------------ music

  private get beatLen() {
    return 60 / (this.night ? 50 : 58);
  }

  private scheduleMusic() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.enabled) return;
    const ahead = ctx.currentTime + 0.3;
    while (this.nextBeat < ahead) {
      this.playBeat(this.beat, this.nextBeat);
      this.nextBeat += this.beatLen;
      this.beat++;
    }
  }

  private playBeat(beat: number, t: number) {
    const bar = Math.floor(beat / 4);
    const inBar = beat % 4;
    const chord = CHORDS[bar % CHORDS.length];
    const barLen = this.beatLen * 4;

    if (inBar === 0) {
      this.pad(chord, t, barLen * 1.05);
      this.bass(chord[0] - 12, t, barLen);
      // compose a fresh 2-bar motif every 4 bars; repeat it with variation in between
      if (bar % 4 === 0 || this.motif.length === 0) this.composeMotif(chord);
      const varied = bar % 4 === 2;
      const density = this.night ? 0.45 : 0.7;
      if (bar % 4 === 3) return; // a resting bar every phrase — room to breathe
      for (const n of this.motif) {
        if (n.t >= 4) continue;
        if (Math.random() > density) continue;
        const deg = Math.min(SCALE.length - 1, Math.max(0, n.deg + (varied ? pick([-1, 0, 0, 1]) : 0)));
        const note = SCALE[deg] - (this.night ? 12 : 0);
        this.bell(note, t + n.t * this.beatLen, this.night ? 0.04 : 0.05, this.musicBus, 3.2);
      }
    }
  }

  /** A short melodic idea: a gentle random walk that leans toward chord tones. */
  private composeMotif(chord: number[]) {
    const rhythm = pick(RHYTHMS);
    const chordPcs = chord.map((n) => n % 12);
    this.motif = rhythm.map((t, i) => {
      let step = pick([-1, -1, 0, 0, 1, 1]); // small steps only: a gentle, singable line
      if (i === 0) {
        // start on a chord tone near the current position
        const options = SCALE.map((n, d) => ({ d, ok: chordPcs.includes(n % 12) })).filter((o) => o.ok);
        const near = options.sort((a, b) => Math.abs(a.d - this.melodyDegree) - Math.abs(b.d - this.melodyDegree))[0];
        step = (near?.d ?? this.melodyDegree) - this.melodyDegree;
      }
      this.melodyDegree = Math.min(SCALE.length - 2, Math.max(1, this.melodyDegree + step));
      return { t, deg: this.melodyDegree };
    });
  }

  private pad(chord: number[], t: number, dur: number) {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = this.night ? 650 : 950;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.04, t + 2.4);
    g.gain.setValueAtTime(0.04, t + dur - 1.2);
    g.gain.linearRampToValueAtTime(0, t + dur + 2.2);
    lp.connect(g).connect(this.musicBus);
    for (const n of chord) {
      for (const detune of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = midiHz(n);
        o.detune.value = detune;
        o.connect(lp);
        o.start(t);
        o.stop(t + dur + 2.3);
      }
    }
  }

  private bass(n: number, t: number, dur: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = midiHz(n);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** Music-box / celesta-like tone: sine + soft octave partial, quick strike, long ring. */
  private bell(n: number, t: number, vol: number, dest: AudioNode = this.musicBus, ring = 1.6) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0008, t + ring);
    const pan = ctx.createStereoPanner();
    pan.pan.value = rand(-0.35, 0.35);
    g.connect(pan).connect(dest);
    if (dest !== this.musicBus) pan.connect(this.reverbSend);
    for (const [mult, amp] of [[1, 1], [2, 0.12]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = midiHz(n) * mult;
      const pg = ctx.createGain();
      pg.gain.value = amp;
      o.connect(pg).connect(g);
      o.start(t);
      o.stop(t + ring + 0.05);
    }
  }

  // ------------------------------------------------------------------ ambience events

  private scheduleEvents() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.enabled) return;
    const now = ctx.currentTime;
    const w = this.weather;

    const drops = { rain: 2, storm: 4, typhoon: 5, drizzle: 1, sunshower: 1 } as Partial<Record<Weather, number>>;
    for (let i = 0; i < (drops[w] ?? 0); i++) if (w !== 'drizzle' || Math.random() < 0.5) this.droplet(now + Math.random() * 0.2);
    if ((w === 'storm' || w === 'typhoon') && now >= this.nextThunder) {
      this.thunder(now + 0.05);
      this.nextThunder = now + (w === 'typhoon' ? rand(12, 22) : rand(7, 16));
    }
    const calm = ['clear', 'breeze', 'mist', 'sakura', 'haze', 'sunshower', 'momiji'].includes(w);
    if (calm && !this.night && Math.random() < 0.06) this.birdPhrase(now + 0.05);
    if ((calm || w === 'heat') && this.night && Math.random() < 0.22) this.cricket(now + 0.05);
    if (w === 'heat' && !this.night && Math.random() < 0.09) this.cicada(now + 0.05);
    if ((w === 'snow' && Math.random() < 0.1) || ((w === 'mist' || w === 'haze') && Math.random() < 0.04)) {
      this.bell(pick([84, 86, 88, 91, 93]), now + 0.05, 0.04, this.ambBus, 2.4);
    }
  }

  /** A summer cicada: a buzzing, pulsing high band that swells and fades. */
  private cicada(t: number) {
    const ctx = this.ctx!;
    const dur = rand(2.5, 5);
    const src = ctx.createBufferSource();
    src.buffer = this.white;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = rand(4200, 6200);
    bp.Q.value = 9;
    const pulse = ctx.createGain();
    pulse.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rand(28, 42);
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 0.5;
    lfo.connect(lfoAmt).connect(pulse.gain);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const pan = ctx.createStereoPanner();
    pan.pan.value = rand(-0.9, 0.9);
    src.connect(bp).connect(pulse).connect(g).connect(pan).connect(this.ambBus);
    src.start(t, Math.random() * 2, dur + 0.1);
    lfo.start(t);
    lfo.stop(t + dur + 0.1);
  }

  private droplet(t: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.white;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = rand(1800, 5200);
    bp.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(rand(0.015, 0.05), t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.03);
    const pan = ctx.createStereoPanner();
    pan.pan.value = rand(-0.8, 0.8);
    src.connect(bp).connect(g).connect(pan).connect(this.ambBus);
    src.start(t, Math.random() * 2, 0.05);
  }

  private thunder(t: number) {
    const ctx = this.ctx!;
    // crack
    const crack = ctx.createBufferSource();
    crack.buffer = this.white;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.0001, t);
    cg.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    cg.gain.exponentialRampToValueAtTime(0.0005, t + 0.5);
    crack.connect(hp).connect(cg).connect(this.ambBus);
    crack.start(t, Math.random(), 0.6);
    // long rolling rumble
    const rumble = ctx.createBufferSource();
    rumble.buffer = this.brown;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(70, t + 3.5);
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.0001, t);
    rg.gain.exponentialRampToValueAtTime(0.6, t + 0.15);
    rg.gain.exponentialRampToValueAtTime(0.001, t + 5);
    rumble.connect(lp).connect(rg).connect(this.ambBus);
    rg.connect(this.reverbSend);
    rumble.start(t, Math.random() * 2, 5.2);
  }

  private birdPhrase(t: number) {
    const ctx = this.ctx!;
    const pan = ctx.createStereoPanner();
    pan.pan.value = rand(-0.9, 0.9);
    pan.connect(this.ambBus);
    pan.connect(this.reverbSend);
    const base = rand(2600, 3600);
    const chirps = Math.floor(rand(2, 6));
    let at = t;
    for (let i = 0; i < chirps; i++) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      const len = rand(0.06, 0.14);
      o.frequency.setValueAtTime(base * rand(0.85, 1.1), at);
      o.frequency.exponentialRampToValueAtTime(base * rand(1.2, 1.5), at + len * 0.4);
      o.frequency.exponentialRampToValueAtTime(base * rand(0.8, 1), at + len);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.035, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0005, at + len);
      o.connect(g).connect(pan);
      o.start(at);
      o.stop(at + len + 0.02);
      at += len + rand(0.03, 0.12);
    }
  }

  private cricket(t: number) {
    const ctx = this.ctx!;
    const pan = ctx.createStereoPanner();
    pan.pan.value = rand(-0.9, 0.9);
    pan.connect(this.ambBus);
    const f = rand(4200, 4800);
    for (let i = 0; i < 3; i++) {
      const at = t + i * 0.06;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.018, at + 0.006);
      g.gain.linearRampToValueAtTime(0, at + 0.035);
      o.connect(g).connect(pan);
      o.start(at);
      o.stop(at + 0.04);
    }
  }
}

export const audio = new ForestAudio();
