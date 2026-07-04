# Audio Assets — Don't Get Pooped!

Procedural retro arcade OGG SFX and BGM generated for the MVP. No external sample libraries were used.

## Runtime paths

This project uses `assets/` as Vite `publicDir`, so Phaser should load files from root-relative paths:

```js
this.load.audio('near_miss', '/audio/sfx/near_miss_whoosh_tick.ogg');
this.load.audio('button_click', '/audio/ui/button_click.ogg');
this.load.audio('music_arcade_survival_loop', '/audio/music/arcade_survival_loop.ogg');
```

## Files

| File | Use |
|---|---|
| `music/arcade_survival_loop.ogg` | 152 BPM / 32-bar loopable retro arcade survival BGM |
| `sfx/dodge_tick_01.ogg` | normal dodge feedback variation 1 |
| `sfx/dodge_tick_02.ogg` | normal dodge feedback variation 2 |
| `sfx/dodge_tick_03.ogg` | normal dodge feedback variation 3 |
| `sfx/near_miss_whoosh_tick.ogg` | near miss reward feedback |
| `sfx/coin_ding.ogg` | coin / golden poop reward |
| `sfx/warning_beep.ogg` | WARNING event alert |
| `sfx/boss_appear_roar.ogg` | boss entrance warning roar / impact stinger |
| `sfx/boss_defeat_burst.ogg` | boss defeated explosion / reward stinger |
| `sfx/hit_splat.ogg` | player hit / poop impact |
| `sfx/game_over_jingle.ogg` | game over stinger |
| `sfx/powerup_shield.ogg` | umbrella shield or power-up activation |
| `ui/button_click.ogg` | UI button tap/click |

## Generation

Regenerate with:

```bash
python3 scripts/generate_audio_sfx.py
python3 scripts/generate_audio_music.py
```

Requires `ffmpeg` with an OGG/Vorbis encoder.
