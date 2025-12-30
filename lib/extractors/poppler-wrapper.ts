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
/**
 * Find the actual output file created by pdftocairo
 * pdftocairo uses zero-padded page numbers based on total page count
 * e.g., -01.png, -001.png, -0001.png
 */
async function findPopplerOutput(
  outputDir: string,
  prefix: string,
  pageNum: number
): Promise<string | null> {
  const { readdir } = await import('fs/promises');
  const files = await readdir(outputDir);

  // Try different zero-padding patterns
  const patterns = [
    `${prefix}-${pageNum}.png`,        // No padding: -1.png
    `${prefix}-${pageNum.toString().padStart(2, '0')}.png`,  // 2 digits: -01.png
    `${prefix}-${pageNum.toString().padStart(3, '0')}.png`,  // 3 digits: -001.png
    `${prefix}-${pageNum.toString().padStart(4, '0')}.png`,  // 4 digits: -0001.png
  ];

  for (const pattern of patterns) {
    const filename = path.basename(pattern);
    if (files.includes(filename)) {
      return path.join(outputDir, filename);
    }
  }

  return null;
}

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

  console.log(`[Poppler DEBUG] Executing: ${command}`);

  try {
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 5000 * 1024,
    });

    if (stderr && !stderr.includes('Syntax Warning')) {
      console.log(`[Poppler] stderr: ${stderr}`);
    }

    if (stdout) {
      console.log(`[Poppler DEBUG] stdout: ${stdout}`);
    }

    console.log(`[Poppler DEBUG] ✓ pdftocairo command completed successfully`);

    // Find the actual output file (pdftocairo uses zero-padding)
    if (page) {
      const actualPath = await findPopplerOutput(out_dir, out_prefix, page);
      if (actualPath) {
        console.log(`[Poppler DEBUG] Found output file: ${actualPath}`);
        return actualPath;
      } else {
        throw new Error(`Could not find pdftocairo output for page ${page} with prefix ${out_prefix}`);
      }
    }

    return stdout;
  } catch (error) {
    console.error('[Poppler] Error executing pdftocairo:', error);
    throw error;
  }
}
