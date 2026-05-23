# MetaMuseum Current State

Last updated: 2026-05-04.

## Scenes

- `baseline`: same four-artwork gallery with ambient background only. No auditory trace sources are created or loaded.
- `art`: same gallery with synchronized spatial auditory traces enabled.
- `traceBubbles`: debug version of `art` with auditory trace bubble visualization shown by default.

Both scenes use `media/gltf/gallery/scene.gltf` as the gallery background.

## Auditory Trace Setup

- Participants: `HR`, `KE`, `SE`.
- Each participant has eight one-shot files.
- All trace files start together on one shared timeline when the scene/audio context starts.
- `1, 3, 5, 7`: lower/floor microphones for footsteps, placed at `0.08m`.
- `2, 4, 6, 8`: upper/head-height microphones, placed at `1.55m`.

Artwork placement by recording number:

- `1/2`: left wall, near entrance.
- `3/4`: left wall, far side.
- `5/6`: right wall, far side.
- `7/8`: right wall, near entrance.

Generated audio folders:

- `media/sound/gallery/hr-denoise-balanced`
- `media/sound/gallery/ke-denoise-balanced`
- `media/sound/gallery/se-denoise-balanced`

## Debug Controls

- Select `traceBubbles` from the scene menu to show auditory trace bubble visualization by default.
- Add `?tracebubbles=1` or `?showtracebubbles=1` to the URL to show the same visualization in the `art` scene.
- Press `B` on desktop to toggle the visualization.
- The visualization is not shown in `baseline`.
- Blue rings/markers represent lower footstep sources; orange rings/markers represent upper mic sources.
- Inner rings show `fullGainRadius = 1.2m`; outer rings show `silenceRadius = 4.5m`.

## HMD Controls

- Hold either grip button and push the right joystick up/down to adjust XR height offset.
- Keyboard fallback: `[` lowers the view, `]` raises it, and `\` resets height offset.
- URL fallback: add `?xrheightoffset=-0.25` to lower the viewer by 25 cm.

## Backup

Pre-baseline backup:

- `.metamuseum-backups/20260504-164808`

This backup contains the trace-enabled `art.js`, scene registry, HMD/keyboard control files, spatial-audio wrapper, ambient audio, and generated HR/KE/SE trace audio.
