#!/usr/bin/env deno

/**
 * SVG to DataURI Converter
 *
 * Converts SVG markup to both URL-encoded and Base64-encoded DataURI strings.
 *
 * Usage:
 *   deno run scripts/to_datauri.ts -- <svg-content>
 *   cat file.svg | deno run scripts/to_datauri.ts
 *   deno run scripts/to_datauri.ts --file input.svg
 *
 * Outputs JSON: { urlEncoded, base64, original }
 */

interface Result {
  urlEncoded: string;
  base64: string;
  original: string;
  warnings: string[];
}

function encodeSVGtoDatauri(svg: string): Result {
  const warnings: string[] = [];
  let cleaned = svg.trim();

  // Strip <?xml ...?> declaration if present
  if (cleaned.startsWith('<?xml')) {
    cleaned = cleaned.replace(/<\?xml[^?]*\?>\s*/i, '');
    warnings.push('Removed <?xml?> declaration (not needed in datauri)');
  }

  // Ensure xmlns is present
  if (!cleaned.includes('xmlns=')) {
    cleaned = cleaned.replace(/<svg\s/, '<svg xmlns="http://www.w3.org/2000/svg" ');
    warnings.push('Added missing xmlns="http://www.w3.org/2000/svg"');
  }

  // Check for external references
  const extRefs = cleaned.match(/<image\s[^>]*href="(?!data:)[^"]+"/gi);
  if (extRefs) {
    warnings.push(
      `Found ${extRefs.length} external image reference(s). These won't render in a datauri context.`
    );
  }

  // Normalize whitespace: collapse to single line for URL-encoded variant
  const minified = cleaned
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+/g, '>')
    .replace(/\s+</g, '<')
    .trim();

  // URL-encoded variant (charset=utf-8)
  const urlEncoded = 'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(minified)
      .replace(/'/g, '%27');

  // Base64 variant
  const base64 = 'data:image/svg+xml;base64,' +
    btoa(unescape(encodeURIComponent(minified)));

  // Size check
  const rawBytes = new TextEncoder().encode(cleaned).length;
  if (rawBytes > 100_000) {
    warnings.push(
      `SVG is large (${(rawBytes / 1024).toFixed(1)}KB). Datauri may exceed practical limits. Consider hosting as a file.`
    );
  } else if (rawBytes > 32_000) {
    warnings.push(
      `SVG is ${(rawBytes / 1024).toFixed(1)}KB. May exceed IE's ~32KB datauri limit.`
    );
  }

  return { urlEncoded, base64, original: cleaned, warnings };
}

// --- CLI handling ---

async function main() {
  const args = Deno.args;
  let svgInput: string | null = null;

  // Check for --file flag
  const fileFlagIndex = args.indexOf('--file');
  if (fileFlagIndex !== -1 && args[fileFlagIndex + 1]) {
    const filePath = args[fileFlagIndex + 1];
    svgInput = await Deno.readTextFile(filePath);
  }
  // Check for piped input
  else if (!Deno.isatty(Deno.stdin.rid)) {
    const decoder = new TextDecoder();
    let buffer = new Uint8Array(0);
    const chunkSize = 1024;
    const tmp = new Uint8Array(chunkSize);
    let n: number | null;
    while ((n = await Deno.stdin.read(tmp)) !== null) {
      const newBuf = new Uint8Array(buffer.length + n);
      newBuf.set(buffer);
      newBuf.set(tmp.subarray(0, n), buffer.length);
      buffer = newBuf;
    }
    svgInput = decoder.decode(buffer);
  }
  // Check for inline argument (after -- separator)
  else {
    const sepIndex = args.indexOf('--');
    if (sepIndex !== -1) {
      svgInput = args.slice(sepIndex + 1).join(' ');
    }
  }

  if (!svgInput || !svgInput.trim()) {
    console.error('Usage:');
    console.error('  deno run scripts/to_datauri.ts -- <svg-markup>');
    console.error('  cat file.svg | deno run scripts/to_datauri.ts');
    console.error('  deno run scripts/to_datauri.ts --file input.svg');
    Deno.exit(1);
  }

  const result = encodeSVGtoDatauri(svgInput);
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.main) {
  main();
}

export { encodeSVGtoDatauri };
export type { Result };
