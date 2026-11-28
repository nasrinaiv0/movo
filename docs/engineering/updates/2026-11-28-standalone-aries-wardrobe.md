# Standalone Aries wardrobe example

Codex prepared this draft PR at the owner's request. The example lives in `examples/aries-wardrobe/` with its own package manifest, lockfile, build, and offline preview. The source copies MOVO's `AriesMascot.js`, `ariesArt.js`, and `AriesMascot.css` byte for byte from commit `a9688176401aef0fbb3495241f4e7201b0e86c57`.

The five preset outfits sit in the lookbook. The Meet Aries sheet opens to the original 14 expressions and places clothing buttons to the right of the live preview. Cap and the other buttons show five garment choices in the same grid. Users can return to expressions with their outfit intact, select garment colors, randomize or reset. The clothes use independent vector layers that follow the original mascot's body groups and respect reduced motion.

The example is browser-local and offline-capable. The repository root app, build scripts, dependency lockfile, APIs, auth, data, and deployment configuration are outside the change. Reverting the example and its documentation removes the change without a migration. GitHub checks and independent review remain pending for the draft.

The copied example built locally after installing from its lockfile. Chromium exercised the offline preview at 320, 390, 768, and 1280px, including every clothing choice, keyboard navigation, reduced motion, and reset to each original expression. The three original mascot files matched their source bytes.
