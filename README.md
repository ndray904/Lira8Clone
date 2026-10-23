# LIRA Eight

## Reference-proportioned edition

The latest composition follows the supplied 1536×1024 concept: a 960 px instrument at reference desktop scale, a 27% diameter scope, pad ring from 14–18.6% radius, shared controls to 28.5%, pair controls to 36.8%, and broad outer voice sectors to 48.2%. Voice tuning/menu coordinates are measured from the reference and stored in `dist/reference-layout.js`. Hyper LFO occupies the top dock; Audio/Latch/Patch/Silence the bottom dock. At the reference viewport width, the disc center is (585,486). Smaller windows retain the same disc proportions with scrolling.

The added utility ring has been removed. Bottom PATCH opens a dialog with presets/save/load, Delay Modulation, and the original round Voice Network buttons. All original parameters remain available. These settings and per-voice fine tuning allow numeric entry without triggering pad keys. The right-hand section legend appears at wide desktop widths. Functional DOM, keyboard, scope and real WASM voice tests pass; visual browser inspection remains unavailable due to the host browser-control initialization failure.

## Compact panel update

All 47 audio parameters now live on the disc. The utility ring places Hyper LFO at top, Delay Modulation at bottom, Voice Network at right, and Audio/Latch/Silence at left. The main panel is at most 960 px in diameter (previously 1120), with a 900 px minimum for readable controls and horizontal scrolling on narrow screens.

FM Source uses a three-position switch preserving Voices/Off/LFO-FB. Hyper LFO Combine uses a two-position AND/OR switch. Both keep the original select as the canonical parameter input, so preset/import/export and DSP mappings remain unchanged. Click/Space/Enter cycles positions; arrow keys and Home/End select positions directly. Voice Network uses the same round checkbox/button styling as Fast; rate knobs remain continuous. Interface tests assert all parameters are within the disc, switches cycle all states, network buttons update state, and presets resynchronize visible switch positions.

## Concentric controls

The functional concentric edition uses eight flat annular wedge pads immediately around the live scope. Moving outward: distortion/delay and four-voice Pitch/Hold groups; four pair sections with Sharp, Mod, Fast and Source; eight voice tuning/menu sectors. Hyper LFO sits above the disc, additional delay modulation and routing below. Every original audio parameter remains reachable. On narrow screens the full-size disc scrolls horizontally so controls keep legible labels and practical hit areas.

Each voice menu shows its actual pair/group and edits the original tuning input. Numeric typing inside the menu is excluded from pad shortcuts; pad shortcuts still work from knobs and ordinary panel controls. All original controls are relocated as existing nodes to preserve listeners and values.

`node test-layout.mjs` uses the dev-only linkedom package to run the actual app initialization, verify all 47 controls remain connected, check ring placement and menus, and edit tuning through both original and menu inputs. Install test dependencies with pnpm. Other tests run without dependencies. Browser visual QA remains unavailable due to the Windows browser-control environment failure.

The circular edition places the real output waveform in the center, touchpads on an inner ring, and the original tuning controls on a second ring. Existing controls are moved as DOM nodes so their event handlers and state persist. The engraved serpent border and runic pad glyphs are SVG decorations; visible numbers and accessible pad labels remain available. Shared voice and effects controls sit below the disc.

The circular scope wraps 1024 time-domain samples from a 2048-sample analyser window around a base radius, anchored to an upward zero crossing. A short seam blend avoids a closure spike. It uses output audio only, caps drawing at 30 FPS, skips hidden tabs, and adapts canvas resolution to screen density. A stopped signal displays an idle circle. This is a radial waveform, not an X–Y/goniometer.

`node test-scope.mjs` verifies the renderer's geometry, real sample consumption, resize behavior and frame cap. Browser visual QA is currently unavailable because the Windows browser-control runtime fails to initialize; responsive CSS and scope geometry were checked in source, but final visual inspection needs the user's browser.

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
