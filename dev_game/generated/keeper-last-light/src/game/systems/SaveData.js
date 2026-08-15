import { SPEC } from '../data/spec.js';
const KEY=SPEC.game.id+'_settings';
export const SaveData={getSettings(){try{return{mute:false,saveVersion:1,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return{mute:false,saveVersion:1}}},setSettings(next){try{localStorage.setItem(KEY,JSON.stringify({...this.getSettings(),...next}))}catch{}}};
