# Institution favicon registry

The MOVO institution favicon map lives in `src/lib/institutionFavicons.js`. UI components should call `getInstitutionFaviconUrl(institutionName, options)` rather than embed long favicon URLs in JSX or repeat provider URLs throughout the codebase.

The registry maps a human-readable institution name to a reviewed domain and country code. The helper builds a dynamic Google S2 favicon URL from that metadata. Unknown/manual institution names return `null`; components must show the existing generic icon in that case. Do not derive domains from arbitrary user input.

**Logo quality note:** Dynamic favicons are convenient, but they are not guaranteed to be the official, full-resolution brand logo. The endpoint may return a small favicon or a generic site icon, and it is a third-party request. If a logo is missing or inaccurate, show the fallback or replace the entry with a reviewed, locally stored asset when appropriate. Do not imply bank connectivity or endorsement.

Before expanding the map, validate each domain and country association. Keep the institution's display name as the lookup key and the domain in this separate file so code stays readable. If the existing account form stores a stable institution ID, prefer migrating the registry key to that ID as part of the country-aware picker integration.
