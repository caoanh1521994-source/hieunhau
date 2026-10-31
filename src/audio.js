// ====== ÂM THANH: nhạc nền + hiệu ứng tổng hợp bằng Web Audio ======
const SND = (() => {
  let ac = null, master = null, musicGain = null, sfxGain = null, timer = null, nextT = 0, step = 0;
  let musicOn = true;
  try { musicOn = localStorage.getItem('hieunhau-v1:music') !== '0'; } catch (e) {}
  const link = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = musicOn ? 0.16 : 0; musicGain.connect(master);
    sfxGain = ac.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
    startMusic();
  }
  function tone(f, t, d, type, vol, out, glide) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'triangle'; o.frequency.setValueAtTime(f, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    link(o, g, out || sfxGain); o.start(t); o.stop(t + d + 0.05);
  }
  function noise(t, d, vol, freq) {
    const len = Math.floor(ac.sampleRate * d), buf = ac.createBuffer(1, len, ac.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq || 2000; g.gain.value = vol || 0.4;
    link(s, f, g, sfxGain); s.start(t);
  }
  const N = m => 440 * Math.pow(2, (m - 69) / 12);
  // Vòng hợp âm C – Am – F – G, giai điệu ngũ cung kiểu ukulele
  const CH = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
  const MEL = [72, 74, 76, 79, 76, 74, 72, 69, 72, 76, 79, 81, 79, 76, 74, 72];
  const PAT = [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0];
  function startMusic() {
    if (timer) return; nextT = ac.currentTime + 0.1; step = 0;
    timer = setInterval(() => {
      while (nextT < ac.currentTime + 0.3) {
        const bar = Math.floor(step / 8) % 4, b = step % 8, ch = CH[bar], dur = 0.3;
        if (b % 2 === 0) tone(N(ch[0] - 12), nextT, 0.5, 'sine', 0.22, musicGain);
        tone(N(ch[(b % 3)]), nextT, 0.25, 'triangle', 0.09, musicGain);
        if (PAT[step % 16]) tone(N(MEL[(step * 3 + bar * 5) % 16]), nextT, 0.28, 'triangle', 0.12, musicGain);
        nextT += dur; step++;
      }
    }, 90);
  }
  function setMusic(on) {
    musicOn = on; try { localStorage.setItem('hieunhau-v1:music', on ? '1' : '0'); } catch (e) {}
    if (musicGain) musicGain.gain.setTargetAtTime(on ? 0.16 : 0, ac.currentTime, 0.2);
  }
  function play(k) {
    if (!ac) return; const t = ac.currentTime;
    switch (k) {
      case 'pop': tone(660, t, 0.09, 'sine', 0.3, 0, 990); break;
      case 'tap': tone(520, t, 0.06, 'triangle', 0.2); break;
      case 'jump': tone(300, t, 0.18, 'sine', 0.25, 0, 620); break;
      case 'open': tone(523, t, 0.12, 'triangle', 0.25); tone(784, t + 0.08, 0.16, 'triangle', 0.25); break;
      case 'ok': [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.07, 0.22, 'triangle', 0.25)); break;
      case 'match': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.08, 0.35, 'triangle', 0.28)); noise(t + 0.3, 0.4, 0.2, 6000); break;
      case 'miss': tone(392, t, 0.18, 'triangle', 0.25); tone(330, t + 0.16, 0.18, 'triangle', 0.25); tone(440, t + 0.34, 0.3, 'triangle', 0.25); break;
      case 'flip': noise(t, 0.12, 0.35, 3000); break;
      case 'clap': noise(t, 0.15, 0.9, 1500); noise(t + 0.02, 0.1, 0.5, 4000); tone(1047, t + 0.05, 0.3, 'sine', 0.2); break;
      case 'hug': [392, 494, 587].forEach((f, i) => tone(f, t + i * 0.12, 0.5, 'sine', 0.22)); break;
      case 'shutter': noise(t, 0.05, 0.8, 5000); noise(t + 0.08, 0.06, 0.6, 3000); break;
      case 'whoosh': noise(t, 0.35, 0.3, 900); tone(200, t, 0.35, 'sine', 0.15, 0, 900); break;
      case 'win': [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.11, 0.3, 'triangle', 0.28)); break;
    }
  }
  return { init, play, setMusic, get musicOn() { return musicOn; } };
})();
