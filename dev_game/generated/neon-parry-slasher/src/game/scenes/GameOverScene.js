import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout, clearLayout } from '../systems/LayoutRegistry.js';
import { AudioSynth } from '../systems/AudioSynth.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SCENES.GAME_OVER);
  }

  init(data) {
    this.finalScore = data?.score || 0;
    this.maxCombo = data?.maxCombo || 0;
    this.totalParries = data?.totalParries || 0;
  }

  create() {
    const { width, height } = SPEC.canvas;

    // Background Image
    if (this.textures.exists('bg-cyber-grid')) {
      this.add.image(width / 2, height / 2, 'bg-cyber-grid')
        .setDisplaySize(width, height)
        .setAlpha(0.45);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, 0x090610).setOrigin(0.5);
    }

    // Title in FHD
    this.title = this.add.text(width / 2, 260, 'CORE BREACH', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '78px',
      color: '#ff0055',
      stroke: '#330011',
      strokeThickness: 10
    }).setOrigin(0.5);

    // Subtitle
    this.subTitle = this.add.text(width / 2, 350, 'ALL SHIELDS DEPLETED', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '30px',
      color: '#ff99aa',
      letterSpacing: 4
    }).setOrigin(0.5);

    // Score Board Glassmorphic Card
    this.add.rectangle(width / 2, 740, width - 120, 560, 0x071120, 0.92)
      .setStrokeStyle(3, 0xff007f, 0.75);

    // Calculate Rank
    let rank = 'C';
    let rankColor = '#aaaaaa';
    if (this.finalScore >= 12000) {
      rank = 'S';
      rankColor = '#ffd700';
    } else if (this.finalScore >= 6000) {
      rank = 'A';
      rankColor = '#00f7ff';
    } else if (this.finalScore >= 2500) {
      rank = 'B';
      rankColor = '#ff007f';
    }

    // Rank Display
    this.add.text(width / 2, 540, `COMBAT RANK: ${rank}`, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '56px',
      color: rankColor,
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5);

    // Stats
    const statsY = 660;
    this.add.text(width / 2, statsY, `SCORE: ${this.finalScore.toLocaleString()}`, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '48px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width / 2, statsY + 80, `MAX COMBO: x${this.maxCombo}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '34px',
      color: '#ffd700'
    }).setOrigin(0.5);

    this.add.text(width / 2, statsY + 150, `TOTAL PARRIES: ${this.totalParries}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '34px',
      color: '#00f7ff'
    }).setOrigin(0.5);

    // Best Record
    const best = localStorage.getItem('neon_parry_high_score') || this.finalScore;
    this.add.text(width / 2, statsY + 220, `BEST RECORD: ${parseInt(best, 10).toLocaleString()}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '30px',
      color: '#a0aab8'
    }).setOrigin(0.5);

    // Retry Button (Magenta theme)
    this.retryBtn = makeTextButton(this, width / 2, 1180, 'REBOOT SYSTEM', () => {
      AudioSynth.playClick();
      AudioSynth.startBGM();
      this.scene.start(SCENES.GAME);
    }, { width: 560, height: 120, theme: 'magenta' });

    // Home Button (Cyan theme)
    this.homeBtn = makeTextButton(this, width / 2, 1330, 'MAIN MENU', () => {
      AudioSynth.playClick();
      this.scene.start(SCENES.HOME);
    }, { width: 560, height: 110, theme: 'cyan' });

    this.publish = () => publishLayout(this, [
      { id: 'gameover-title', obj: this.title },
      { id: 'retry-btn', obj: this.retryBtn.bg },
      { id: 'home-btn', obj: this.homeBtn.bg }
    ], { requiredIds: ['gameover-title', 'retry-btn'] });

    this.publish();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, clearLayout);
  }
}
