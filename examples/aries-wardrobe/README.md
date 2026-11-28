# Aries Wardrobe

A standalone costume lookbook with five coordinated looks from the supplied reference. Customize Aries opens the Meet Aries expression grid. The clothing buttons beside the preview switch those tiles to five visual choices each for caps, scarves, T-shirts, jackets, pants and shoes. Back to expressions restores the original grid while keeping the selected outfit. The picker also includes preset and custom colors, Randomize and Reset. Reset removes the added clothing layers and keeps the current expression.

## Run locally

```sh
npm ci
npm run dev
```

Run `npm run build` to produce the static app in `dist/`. Open `dist/preview.html` directly for an offline, single-file copy.

## Original artwork

The original `AriesMascot.js`, `ariesArt.js`, and `AriesMascot.css` are byte-for-byte copies from [MOVO commit a968817](https://github.com/nasrinaiv0/movo/commit/a9688176401aef0fbb3495241f4e7201b0e86c57). The standalone app renders the original React component. Garment SVGs mount independently on the original body groups and inherit their transforms. Vite compiles the original component’s JSX without editing the copied file.

The lookbook models stay still. The fitting preview keeps the original expressions and animations and supports the device’s reduced-motion preference and a manual pause. Color changes and garment transitions apply only to the clothing layers. The wardrobe runs offline and has no MOVO API, account, or deployment integration.
