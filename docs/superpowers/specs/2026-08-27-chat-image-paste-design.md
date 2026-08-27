# Chat Image Paste Design

## Goal

Allow users to paste local images into the Prometheus editor chat and send them as the same visual-reference attachments supported by the existing file picker.

## Behavior

- Handle clipboard paste in both the compact editor relay composer and the expanded chat composer.
- Extract image clipboard items only; preserve normal text paste behavior.
- Reuse the existing image validation and FileReader data-URL attachment pipeline.
- Keep at most four pending image attachments, matching the current picker limit.
- Render pasted images in the existing attachment strip with the existing remove controls.
- Preserve the existing request shape and send attachments through `/api/prometheus-chat`.
- Allow attachment-only sends using the existing visual-reference fallback prompt.

## Error Handling

Unsupported clipboard content is ignored so ordinary text paste remains unchanged. Failed image reads surface the existing attachment error toast. Oversized images continue to be rejected by the shared attachment validator.

## Testing

Add focused tests for clipboard image extraction, non-image preservation, the four-image limit, and propagation of attachment data through the composer submission path.
