declare module 'pdf-poppler' {
  export interface ConvertOptions {
    format?: 'png' | 'jpeg' | 'tiff' | 'pdf' | 'ps' | 'eps' | 'svg';
    out_dir?: string;
    out_prefix?: string;
    page?: number | null;
    scale?: number;
  }

  export function convert(
    pdfPath: string,
    options: ConvertOptions
  ): Promise<string>;

  export const path: string;
  export const exec_options: any;
}
