declare module 'jsdom' {
  export class JSDOM {
    constructor(html?: string, options?: { url?: string })
    readonly window: {
      document: Document
      close(): void
    }
  }
}
