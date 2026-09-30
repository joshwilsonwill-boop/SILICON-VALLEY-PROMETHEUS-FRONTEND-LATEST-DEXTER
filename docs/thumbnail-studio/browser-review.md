# Thumbnail browser review

Actual components exercised with local API fixtures; no paid generation or project writes.

The configured Google provider returned HTTP 200 model metadata for both Gemini 3.1 Flash Image and Gemini 3 Pro Image, each exposing generateContent. A paid image-generation smoke test remains unexecuted: automatic approval review requires specific approval to upload the local source image to Google.

- Live preview, aspect ratios, layouts, emphasis, background, accent, text scale, frame selection, feed size, guides, and reference upload respond correctly.
- Generation carries the selected settings; saving and image download work; edits retain earlier variants; restoration and cancellation preserve exportable artwork.
- 390px mobile layout has no horizontal overflow; brand controls remain usable; focus stays within the dialog and returns on Escape; generation and save errors preserve prior artwork.
- A delayed save overlapping a second generation does not mark the new version as saved; the original cover save completes and the new version remains separately saveable.
