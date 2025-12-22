import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export interface PopplerOptions {
  format: 'png' | 'jpeg';
  out_dir: string;
  out_prefix: string;
  page?: number;
  scale?: number;
}

/**
 * Convert PDF page(s) to images using system-installed Poppler
 */
export async function convertPdfToImage(
  pdfPath: string,
  options: PopplerOptions
): Promise<string> {
  const {
    format,
    out_dir,
    out_prefix,
    page,
    scale = 1024,
  } = options;

  const outputPath = path.join(out_dir, out_prefix);

  // Build command arguments
  const args: string[] = [
    `-${format}`,
  ];

  // Add page selection if specified
  if (page) {
    args.push('-f', page.toString(), '-l', page.toString());
  }

  // Add scale
  if (scale) {
    args.push('-scale-to', scale.toString());
  }

  // Add input and output paths
  args.push(pdfPath, outputPath);

  // Execute pdftocairo
  const command = `pdftocairo ${args.join(' ')}`;

  try {
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 5000 * 1024,
    });

    if (stderr && !stderr.includes('Syntax Warning')) {
      console.log(`[Poppler] stderr: ${stderr}`);
    }

    return stdout;
  } catch (error) {
    console.error('[Poppler] Error executing pdftocairo:', error);
    throw error;
  }
}
