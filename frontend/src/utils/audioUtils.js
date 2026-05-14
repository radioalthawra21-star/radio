let audioCtx = null;
let unlocked = false;

const getCtx = () => {
  if (!audioCtx || audioCtx.state === 'closed') {
    const C = window.AudioContext || window.webkitAudioContext;
    audioCtx = new C();
  }
  return audioCtx;
};

const unlockNow = () => {
  if (unlocked) return;
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
  unlocked = true;
};

if (typeof window !== 'undefined') {
  const unlock = () => {
    unlockNow();
    const evs = ['click', 'keydown', 'touchstart', 'mousedown'];
    evs.forEach(e => window.removeEventListener(e, unlock, true));
  };
  const evs = ['click', 'keydown', 'touchstart', 'mousedown'];
  evs.forEach(e => window.addEventListener(e, unlock, true));
}

const playWav = (freq, dur, vol = 0.4, delay = 0) => {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
      console.log('AudioContext resumed');
    }
    if (ctx.state !== 'running') {
      console.log('AudioContext state:', ctx.state);
      return;
    }
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = t < 0.01 ? t / 0.01 : 1 - (t / dur);
      d[i] = Math.sin(2 * Math.PI * freq * t) * vol * Math.max(0, env);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(ctx.currentTime + delay);
    src.stop(ctx.currentTime + delay + dur);
    console.log('Playing sound:', freq, 'Hz,', dur, 's');
  } catch (e) {
    console.log('WAV play error:', e);
  }
};

const playSeq = (freqs, dur, vol, gap) => {
  freqs.forEach((f, i) => playWav(f, dur, vol, i * gap));
};

export const playNotificationSound = () => playWav(800, 0.3, 0.4);

export const playTaskAssignedSound = () => {
  playWav(600, 0.2, 0.4);
  setTimeout(() => playWav(800, 0.3, 0.35), 180);
};

export const playRoleChangeSound = () => {
  playSeq([400, 500, 600, 800], 0.15, 0.35, 0.12);
};

export const playLeaveRequestedSound = () => {
  playSeq([523, 659, 784], 0.2, 0.38, 0.18);
};

export const playLeaveApprovedSound = () => {
  playSeq([523, 659, 784, 1047], 0.2, 0.35, 0.14);
};

export const playLeaveRejectedSound = () => {
  playSeq([400, 350, 300], 0.25, 0.35, 0.22);
};

export const playLeaveCancelledSound = () => {
  playSeq([600, 500, 400], 0.2, 0.35, 0.18);
};

export const playMessageSound = () => {
  playSeq([1200, 1400, 1600], 0.18, 0.38, 0.14);
};
