# Audio Assets — Don't Get Pooped!

Procedural retro arcade OGG SFX generated for the MVP. No external sample libraries were used.

## Runtime paths

This project uses `assets/` as Vite `publicDir`, so Phaser should load files from root-relative paths:

```js
this.load.audio('near_miss', '/audio/sfx/near_miss_whoosh_tick.ogg');
this.load.audio('button_click', '/audio/ui/button_click.ogg');
```

## Files

| File | Use |
|---|---|
| `sfx/dodge_tick_01.ogg` | normal dodge feedback variation 1 |
| `sfx/dodge_tick_02.ogg` | normal dodge feedback variation 2 |
| `sfx/dodge_tick_03.ogg` | normal dodge feedback variation 3 |
| `sfx/near_miss_whoosh_tick.ogg` | near miss reward feedback |
| `sfx/coin_ding.ogg` | coin / golden poop reward |
| `sfx/warning_beep.ogg` | WARNING event alert |
| `sfx/hit_splat.ogg` | player hit / poop impact |
| `sfx/game_over_jingle.ogg` | game over stinger |
| `sfx/powerup_shield.ogg` | umbrella shield or power-up activation |
| `ui/button_click.ogg` | UI button tap/click |

## Generation

Regenerate with:

```bash
python3 scripts/generate_audio_sfx.py
```

Requires `ffmpeg` with an OGG/Vorbis encoder.
