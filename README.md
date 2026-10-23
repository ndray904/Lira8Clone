# LIRA Eight

## Layout

Every control lives on one circular plate ringed by an ouroboros, in a flat scratchboard style: bone-white ink scratched into black, smoky grime worked into the plate, dried-blood red for live values, New Rocker and Grenze type. An SVG filter (`#worn` in `index.html`) roughens and breaks up the ink; text uses a gentler `#rough`. Each slider's knob is a sigil (`dist/slider-knob.png`) barely wider than its slot.

- **Centre**: the live circular scope, ringed by eight touch pads; each pad sits directly under its voice's Tune slider.
- **Sliders** radiate outward like rays (`dist/disc.js` lays them out clockwise from a single list, so nothing is hand-placed). Voices 1–4 fill the right side and 5–8 the left: per pair, Tune, Mod, Sharp, Tune, with the pair's FM Source switch and Fast LED in the inner band beneath Mod and Sharp, and each group's Pitch and Hold between the pairs. Delay Mod, Delay and Output run across the top; Hyper LFO and the Voice Network switches sit at the bottom. Tune sliders are longer, in proportion to the old tune knobs. Group names are engraved round the rim, and labels on the left and bottom turn so they read upright.
- **Serpent** (`dist/ouroboros.webp`): an engraved ouroboros, centred and corrected to a true circle so its inner edge sits on the plate rim. The top row of sliders leaves a gap where the head dips inside the ring.
- **Corners**: name and status, presets and save/load, latch/silence/audio power, and the key hints.

Drag a slider along its ray (Shift for fine adjustment); each keeps a hidden range input for keyboard and screen-reader access. A Tune slider's value opens a fine-tune dialog. At wide screen proportions the disc fills the window height with the controls in the corners; narrower screens stack them above and below, and phones scroll the disc sideways inside its own frame.

`node test-layout.mjs` uses the dev-only linkedom package to run the actual app initialization, verify all 47 controls are connected and on the disc as radial sliders or switches, check ray spacing, pad alignment and label orientation, cycle every switch, apply a preset, and edit tuning through both the slider input and the fine-tune dialog. Install test dependencies with pnpm. Other tests run without dependencies.

The scope has three views, chosen by the Ring / Sphere / Radiate switch beside Latch (remembered per browser). All three read the same live output samples; nothing is synthesised. `dist/sphere-scope.js` draws the 3D views on a 2D canvas with a slowly turning perspective camera. **Sphere** winds the 1024-sample window pole to pole around a sphere whose radius each sample pushes in or out. **Radiate** treats the output as a point source: the outgoing solution of the scalar spherical wave equation, p(r,t) = (r₀/r)·s(t − (r − r₀)/c), drawn as six wireframe shells, each showing the signal as it left the centre a little earlier and weakened as 1/r. Both 3D views auto-scale to the window's peak, as a scope's auto-gain does. `node test-scope.mjs` checks that silence is a true sphere, that the surface follows each sample, that an impulse reaches only the shell at its delay, and that pressure falls as 1/r.

The ring view wraps 1024 time-domain samples from a 2048-sample analyser window around a base radius, anchored to an upward zero crossing. A short seam blend avoids a closure spike. It uses output audio only, caps drawing at 30 FPS, skips hidden tabs, and adapts canvas resolution to screen density. A stopped signal displays an idle circle. This is a radial waveform, not an X–Y/goniometer. `node test-scope.mjs` verifies the renderer's geometry, real sample consumption, resize behavior and frame cap.

A static browser instrument using Mike Moreno DSP's LIRA•8 Pure Data engine, hosted in hyrfilm/libpd-wasm. No package installation or build framework required. Serve over localhost or HTTPS for AudioWorklet support.

## Run

`node serve.mjs` — open http://127.0.0.1:4173, click Start audio, and hold pads or number keys 1–8. Hold sustains each four-voice group. Space or Silence suspends audio. Save/load uses local JSON files.

`node prepare.mjs` regenerates the patch bundle from the retained upstream files. `node test-engine.mjs` runs the actual WASM processor offline, checking loading, eight voices, and finite feedback output. `node --check dist/app.js` checks JS syntax.

## Preview and deploy

Work happens on the `dev` branch. Each push to `main` runs every `test-*.mjs` script and, if they pass, deploys `dist/` to GitHub Pages (`.github/workflows/pages.yml`); Pages must use "GitHub Actions" as its source. Unmerged `dev` changes are previewed in a private Claude Artifact (https://claude.ai/artifact/6o3Vq1AojiEHUBX2zGYkb1), which serves the same `dist/` files with the page's document wrapper removed.

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
