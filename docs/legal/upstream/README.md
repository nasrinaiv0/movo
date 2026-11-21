# Upstream notice provenance

Collected 2026-11-21 for MOVO's software credits. These files are upstream notices/provenance, not a license for MOVO's name or third-party decorative logos.

- data-uri-to-buffer 4.0.1: full MIT section from its installed published README.
- jsonify 0.0.1: published README and public-domain declaration.
- jsrsasign 11.1.5: https://raw.githubusercontent.com/kjur/jsrsasign/11.1.5/LICENSE.txt — includes its component notices.
- @napi-rs/canvas platform packages 0.1.100: accompanying canvas 0.1.100 wrapper MIT license. Native platform binaries are not intended iOS web assets; review the actual bundle separately.
- tr46 0.0.3: unresolved full-notice evidence. The exact published metadata is retained; its MIT declaration is not replaced with an invented copyright grant.
- Font OFL texts: official google/fonts repository; source URLs, retrieval date and hashes are recorded in font-license-sources.json.

Regenerate the aggregated credits with `node scripts/generate-third-party-notices.cjs` from the locked install. It includes exact source-package URLs, including the MPL-2.0 native plugins. Do not claim every dependency is MIT or remove upstream attribution. License/ownership review is still required before completing submission evidence.
