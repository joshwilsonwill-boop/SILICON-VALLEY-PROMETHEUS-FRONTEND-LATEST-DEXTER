export const MB = 1024 * 1024

export type ChatAttachmentKind = 'image' | 'video'

export type AttachmentValidation =
  | { kind: ChatAttachmentKind; valid: true }
  | { kind?: ChatAttachmentKind; message: string; valid: false }

export function extractImageFilesFromClipboard(data: DataTransfer): File[] {
  return Array.from(data.items)
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file))
    .slice(0, 4)
}

export function describeAttachment(
  file: Pick<File, 'name' | 'size' | 'type'>,
): AttachmentValidation {
  const kind: ChatAttachmentKind | null = file.type.startsWith('image/')
    ? 'image'
    : file.type.startsWith('video/')
      ? 'video'
      : null

  if (!kind) return { message: 'Choose an image or video file.', valid: false }

  const limit = kind === 'image' ? 20 * MB : 100 * MB
  if (file.size > limit) {
    const label = kind === 'image' ? 'Image' : 'Video'
    return { kind, message: `${label} too large. Maximum size is ${limit / MB}MB.`, valid: false }
  }

  return { kind, valid: true }
}
