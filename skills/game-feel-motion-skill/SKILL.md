---
name: game-feel-motion-skill
description: Design and QA game feel, UI motion, feedback animation, and motion-ready asset pipelines for games. Use when creating or reviewing game input feel, hit/reward/skill/UI/transition animations, sequential sprite/VFX assets, spritesheet spacing rules, motion tokens, duration/easing/spring values, or Block/Approve polish QA. Scope is timing, easing, and runtime feel judgement; route pixel-level frame repositioning to game-asset-creation.
---

# Game Feel Motion Skill

## Overview

Use this skill to turn a game interaction into a complete polish pipeline:

```text
Input or event
→ feel goal
→ motion vocabulary
→ sequential asset brief
→ non-overlap asset generation
→ manifest / atlas contract
→ implementation values
→ in-game test
→ Block / Approve QA
```

This skill is for the **game feel / UI motion / feedback polish layer**. Do not use it as the primary source for combat rules, map generation, economy balancing, networking, or AI behavior.

## Core Workflow

**1. Identify the event and classify it.** The class decides what you must define — get this wrong
and the rest of the flow produces the wrong spec.

| Class | Define |
|---|---|
| Player input / control feel | action abstraction, response window, buffering, cancellation, feedback timing |
| UI motion (menu actions, state changes) | state transition, duration, easing/spring, reduced-motion fallback, visual hierarchy |
| Hit / reward / skill / cooldown / transition feedback | motion vocabulary, VFX·audio·haptic assets, screen/camera impact, timing stack |

**2. Define the feel goal and name the motion.** snappy, heavy, elastic, soft, premium, dangerous,
rare, successful, interrupted, urgent — then use the precise vocabulary in
`references/final-pipeline.md`.

**3. Write the asset brief before implementation.** `assets/templates/asset-brief.md` for
single-state or UI; `assets/templates/sequential-asset-brief.md` for frame-based or VFX motion.

**4. If the motion needs generated image frames**, enforce the spacing contract in
`references/sequential-motion-assets.md` — fixed cell size, pivot, baseline, gap, margin, and the
non-overlap rule. Then produce or request the source assets, game-ready exports, spritesheet/atlas
metadata, and any audio/haptic markers.

**5. Choose the numbers** — duration, easing, spring, frame count, sequencing — from
`references/motion-values-and-tokens.md`.

**6. Integrate through the game loop** without coupling raw input to animation code.

**7. Validate, then judge.** Run `scripts/validate_spritesheet_manifest.py` when a manifest exists,
then Block/Approve QA per `references/review-standards.md`. **Block if readability, spacing, timing,
accessibility, or the implementation contract fails.**

## Required Outputs

For each motion task, produce these outputs unless the user explicitly asks for only one part:

- **Motion spec:** event, feel goal, vocabulary name, duration, easing/spring, timing.
- **Asset spec:** required source assets, sequential frames, export format, frame size, gap, padding, pivot, baseline.
- **Manifest:** frame count, fps, layout, anchors, loop mode, tags, and engine import metadata.
- **Implementation note:** where the animation runs and how it connects to input/update/render.
- **QA result:** `Approve` or `Block`, with concrete reasons and fixes.

## Resource Routing

- Read `references/final-pipeline.md` for the full end-to-end pipeline.
- Read `references/sequential-motion-assets.md` when spritesheets, VFX sequences, generated image frames, spacing, or overlap risk is involved.
- Read `references/asset-generation-prompts.md` before writing prompts for image or sprite/VFX asset generation.
- Read `references/motion-values-and-tokens.md` when choosing duration, easing, spring, frame count, or TypeScript motion tokens.
- Read `references/review-standards.md` before final QA or when the user asks whether motion should pass.
- Use `assets/templates/asset-brief.md` for single-state or UI assets.
- Use `assets/templates/sequential-asset-brief.md` for frame-by-frame, spritesheet, VFX, trails, or transition sequences.
- Use `assets/templates/motion-qa-checklist.md` for manual review.
- Use `assets/templates/spritesheet-manifest.schema.json` or `assets/templates/vfx-manifest.schema.json` when creating manifests.
- Use `assets/templates/motion-tokens.template.ts` when the project needs reusable implementation constants.
- Run `scripts/validate_spritesheet_manifest.py <manifest.json>` to validate layout math and required metadata.

## Non-Negotiables

- Do not generate or approve sequential image assets without a fixed cell size, gap, margin, pivot, and baseline.
- Do not allow character parts, weapons, glow, shadows, particles, or trails to cross into neighboring cells.
- Do not approve animation that feels good in isolation but hides gameplay information.
- Do not rely on color alone for feedback.
- Do not mix art styles without calling it out as a Block.
- Do not put large production asset libraries inside this skill; keep reusable templates here and production assets in the game project.
- Prefer specific motion names and numeric timing values over vague feedback like "make it smoother".
