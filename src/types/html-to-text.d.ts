declare module "html-to-text" {
  interface ConvertOptions {
    wordwrap?: boolean | number;
    selectors?: Array<{ selector: string; options?: Record<string, unknown>; format?: string }>;
    uppercaseHeadings?: boolean;
    preserveNewlines?: boolean;
  }

  export function convert(html: string, options?: ConvertOptions): string;
}
