import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout, clearLayout } from '../systems/LayoutRegistry.js';
import { AudioSynth } from '../systems/AudioSynth.js';

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super(SCENES.HOME);
  }

  create() {
    const { width, height } = SPEC.canvas;

    // 1. Native FHD Cyberpunk Background Image (1080x1920 1:1)
    if (this.textures.exists('bg-cyber-grid')) {
      this.add.image(width / 2, height / 2, 'bg-cyber-grid')
        .setDisplaySize(width, height)
        .setAlpha(0.72);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, 0x070913).setOrigin(0.5);
    }

    // 2. Sound Toggle Button (Top Right)
    const getSoundLabel = () => (AudioSynth.muted ? 'MUTE' : 'AUDIO');
    this.soundBtn = makeTextButton(this, width - 110, 95, getSoundLabel(), () => {
      const isMuted = AudioSynth.toggleMute();
      this.soundBtn.txt.setText(getSoundLabel());
    }, { width: 150, height: 80, fontSize: '28px', theme: 'cyan' });

    // 3. Title Header with Neon Glow in FHD
    this.title = this.add.text(width / 2, 240, 'NEON PARRY', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '84px',
      color: '#00f7ff',
      stroke: '#002244',
      strokeThickness: 12,
      align: 'center'
    }).setOrigin(0.5);

    this.subTitle = this.add.text(width / 2, 335, '⚡ CYBER RONIN KAI ⚡', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '34px',
      color: '#ff007f',
      stroke: '#33001a',
      strokeThickness: 7,
      letterSpacing: 4
    }).setOrigin(0.5);

    // Title pulsing animation
    this.tweens.add({
      targets: [this.title, this.subTitle],
      scale: { from: 0.98, to: 1.02 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 4. Center Preview: Hero Pedestal & Ronin
    const pedestal = this.add.ellipse(width / 2, 750, 280, 90, 0x00f7ff, 0.25)
      .setStrokeStyle(4, 0x00f7ff, 0.9);
    const ronin = this.add.sprite(width / 2, 610, 'player-ronin').setScale(0.42);
    const aura = this.add.circle(width / 2, 610, 150, 0x00ffff, 0.15)
      .setStrokeStyle(4, 0x00ffff, 0.8);

    this.tweens.add({
      targets: [pedestal, aura],
      scaleX: { from: 0.96, to: 1.06 },
      scaleY: { from: 0.96, to: 1.06 },
      alpha: { from: 0.2, to: 0.45 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 5. Glassmorphic Instruction Card (FHD)
    const boxY = 1040;
    const boxBg = this.add.rectangle(width / 2, boxY, width - 120, 320, 0x061122, 0.9)
      .setStrokeStyle(3, 0x00f7ff, 0.65)
      .setOrigin(0.5);

    this.helpText = this.add.text(width / 2, boxY, [
      '⚡ COMBAT PROTOCOL ⚡',
      '',
      '• Swipe or Tap in bullet direction to Slash',
      '• Deflect bullets within 0.12s for Just Parry!',
      '• Chain 10 Combos to trigger 360° FEVER',
      '• 3 Shields: Defend Neo-Shibuya core'
    ].join('\n'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#d4edff',
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5);

    // 6. High Score Badge
    const highScore = localStorage.getItem('neon_parry_high_score') || 0;
    this.scoreText = this.add.text(width / 2, 1280, `BEST RECORD: ${parseInt(highScore, 10).toLocaleString()}`, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '38px',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    // 7. Buttons: Start Game + Story / Lore Modal
    this.startBtn = makeTextButton(this, width / 2, 1440, 'INITIALIZE COMBAT', () => {
      AudioSynth.playClick();
      AudioSynth.startBGM();
      this.scene.start(SCENES.GAME);
    }, { width: 620, height: 124, oneShot: true, theme: 'cyan' });

    this.storyBtn = makeTextButton(this, width / 2, 1590, '⚡ CHARACTER STORY ⚡', () => {
      AudioSynth.playClick();
      this.showStoryModal();
    }, { width: 620, height: 108, theme: 'magenta' });

    // Layout Registry for QA Contracts
    this.publish = () => publishLayout(this, [
      { id: 'title', obj: this.title },
      { id: 'instructions', obj: boxBg },
      { id: 'start-button', obj: this.startBtn.bg },
      { id: 'sound-toggle', obj: this.soundBtn.bg }
    ], { requiredIds: ['title', 'start-button'] });

    this.publish();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, clearLayout);
  }

  showStoryModal() {
    const { width, height } = SPEC.canvas;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.88)
      .setInteractive()
      .setDepth(200);

    const card = this.add.rectangle(width / 2, height / 2, width - 100, height - 240, 0x061224, 0.96)
      .setStrokeStyle(4, 0x00f7ff, 0.9)
      .setDepth(201);

    // Story Art Preview
    const storyImg = this.add.image(width / 2, height / 2 - 280, 'ronin-storyboard')
      .setDisplaySize(width - 180, (width - 180) * 1.05)
      .setDepth(202);

    const storyTitle = this.add.text(width / 2, height / 2 + 130, 'KAI: THE LAST CYBER RONIN', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '40px',
      color: '#00f7ff',
      stroke: '#003366',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(202);

    const storyBody = this.add.text(width / 2, height / 2 + 300, [
      'Year 2099. Neo-Shibuya is under siege by rogue',
      'autonomous assault drones. Kai, the last guardian',
      'equipped with an overcharged plasma katana and',
      'energy deflector gauntlet, stands as humanity’s',
      'final shield at the summit of the Central Core.'
    ].join('\n'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#d0eaff',
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5).setDepth(202);

    const closeBtn = makeTextButton(this, width / 2, height / 2 + 520, 'CLOSE PROTOCOL', () => {
      AudioSynth.playClick();
      overlay.destroy();
      card.destroy();
      storyImg.destroy();
      storyTitle.destroy();
      storyBody.destroy();
      closeBtn.destroy();
    }, { width: 480, height: 100, theme: 'cyan' });

    closeBtn.bg.setDepth(203);
    closeBtn.txt.setDepth(204);
    closeBtn.glow.setDepth(202);
  }
}
