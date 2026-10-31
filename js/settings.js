export const Settings = {
  s: { sound: true, particles: true, dmgNumbers: true, musicVolume: 0.7, sfxVolume: 0.8 },
  init(saved = {}) { Object.assign(this.s, saved || {}); },
  serialize() { return { ...this.s }; }
};