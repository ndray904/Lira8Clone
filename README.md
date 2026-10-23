# LIRA Eight

## Layout

The instrument is a circular disc flanked by two rails of global modules.

- **Disc** (`dist/disc.js` computes every position from ring radii, so nothing is hand-placed): the live circular scope in the centre, eight annular touch pads around it, a ring of four pair quadrants (Mod, Sharp, Fast, FM Source), and an outer ring of eight voice sectors with Tune knobs. Each tune knob's value readout opens a fine-tune dialog. Pair and voice names are engraved along the rings; controls in the bottom quadrant hang their labels toward the centre so they never collide with the engraving.
- **Left rail**: Hyper LFO, Delay and delay modulation.
- **Right rail**: Group A/B Pitch and Hold, Distortion, Voice Network.
- **Header**: status, starting point presets, save/load, latch, silence and audio power.

Knobs are dragged vertically (Shift for fine adjustment); each keeps a hidden range input for keyboard and screen-reader access. The disc fits the viewport at desktop sizes, the rails wrap below it under 1260 px, and on phones the disc keeps a playable 560 px size and scrolls sideways inside its own frame.

`node test-layout.mjs` uses the dev-only linkedom package to run the actual app initialization, verify all 47 controls are connected and placed on the disc or rails, cycle every switch, apply a preset, and edit tuning through both the knob input and the fine-tune dialog. Install test dependencies with pnpm. Other tests run without dependencies.

The circular scope wraps 1024 time-domain samples from a 2048-sample analyser window around a base radius, anchored to an upward zero crossing. A short seam blend avoids a closure spike. It uses output audio only, caps drawing at 30 FPS, skips hidden tabs, and adapts canvas resolution to screen density. A stopped signal displays an idle circle. This is a radial waveform, not an X–Y/goniometer. `node test-scope.mjs` verifies the renderer's geometry, real sample consumption, resize behavior and frame cap.

A static browser instrument using Mike Moreno DSP's LIRA•8 Pure Data engine, hosted in hyrfilm/libpd-wasm. No package installation or build framework required. Serve over localhost or HTTPS for AudioWorklet support.

## Run

`node serve.mjs` — open http://127.0.0.1:4173, click Start audio, and hold pads or number keys 1–8. Hold sustains each four-voice group. Space or Silence suspends audio. Save/load uses local JSON files.

`node prepare.mjs` regenerates the patch bundle from the retained upstream files. `node test-engine.mjs` runs the actual WASM processor offline, checking loading, eight voices, and finite feedback output. `node --check dist/app.js` checks JS syntax.

## Provenance and compatibility

- LIRA•8: https://github.com/MikeMorenoDSP/LIRA-8 commit `6a6b6cbc3359a20d7741c9270c7690ab6b21c92a`.
- libpd-wasm: https://github.com/hyrfilm/libpd-wasm commit `5570d36ec99820b4c6fb9662be6ead7bfbd59572`; vanilla prebuilt AudioWorklet in dist/libpd-worklet.js, unchanged.
- Licenses retained in upstream/ and dist/LICENSES.txt.
- Original patches retained in upstream/. Generated browser copy substitutes a fixed namespace (8008) so controls address DSP receives, replaces desktop GUI widgets with inert list objects preserving connection indices, and disables the delayed custom random seed broadcast. The supplied WASM runtime traps when random receives its seed method; default Pure Data RNG seeds work. Synthesis and effects connections remain intact. Browser controls initialize all 47 parameters directly.
- A browser compressor and gain stage follow the original mono engine. The two output channels carry the same signal.
- Keyboard, multitouch pads, latch, four starting points, waveform display, and validated patch import/export are implemented. No microphone or external audio input.
- This is an unofficial digital interpretation, not a circuit-accurate LYRA-8 model.

## Verification

The real WASM processor loaded all objects with no missing-object diagnostics. Initial dry output was silent; each of eight voices produced nonzero finite audio; a three-second high-feedback/distortion render remained finite. Local HTTP returned 200 and application JavaScript passed syntax checks. Automated browser interaction and visual inspection were unavailable because the computer-use runtime failed to initialize its Windows security environment. Listening quality, mobile interaction, and browser performance require user verification.
