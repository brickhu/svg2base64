#!/usr/bin/env deno

/**
 * DataURI to SVG Converter
 *
 * Decodes URL-encoded or Base64-encoded DataURI strings back to pretty-printed SVG markup.
 *
 * Usage:
 *   deno run scripts/to_svg.ts -- <datauri-string>
 *   echo "data:image/svg+xml;base64,..." | deno run scripts/to_svg.ts
 *   deno run scripts/to_svg.ts --file input.txt
 *
 * Outputs JSON: { svg, format, original, warnings }
 */

interface Result {
  svg: string;
  format: 'base64' | 'url-encoded' | 'plain-base64';
  warnings: string[];
  original: string;
}

function formatSVG(svg: string): string {
  // Simple pretty-printer: add indentation after each opening tag

  // First normalize
  let formatted = svg
    .replace(/>\s+</g, '><')
    .replace(/>\s+/g, '>')
    .replace(/\s+</g, '<')
    .trim();

  const indentSize = 2;
  let indent = 0;
  const lines: string[] = [];
  let current = '';
  let inTag = false;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < formatted.length; i++) {
    const ch = formatted[i];

    if (inString) {
      current += ch;
      if (ch === stringChar) inString = false;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }

    if (ch === '<') {
      if (current.trim()) {
        const trimmed = current.trim();
        if (trimmed) lines.push(' '.repeat(indent * indentSize) + trimmed);
      }
      current = '<';
      inTag = true;
      continue;
    }

    if (ch === '>') {
      current += '>';
      inTag = false;

      const isClosing = current.startsWith('</');
      const isSelfClosing = current.endsWith('/>') || current.endsWith('"/>');
      const isComment = current.startsWith('<!--');
      const isDeclaration = current.startsWith('<?');
      const isCDATA = current.startsWith('<![CDATA[');

      if (isComment) {
        lines.push(' '.repeat(indent * indentSize) + current);
      } else if (isDeclaration) {
        lines.push(current);
      } else if (isCDATA) {
        lines.push(' '.repeat(indent * indentSize) + current);
      } else if (isClosing) {
        indent = Math.max(0, indent - 1);
        lines.push(' '.repeat(indent * indentSize) + current);
      } else if (isSelfClosing) {
        lines.push(' '.repeat(indent * indentSize) + current);
      } else {
        lines.push(' '.repeat(indent * indentSize) + current);
        indent++;
      }

      current = '';
      continue;
    }

    if (inTag) {
      current += ch;
    } else if (!/\s/.test(ch)) {
      current += ch;
    } else if (current.trim()) {
      current += ch;
    }
  }

  if (current.trim()) {
    lines.push(' '.repeat(indent * indentSize) + current.trim());
  }

  return lines.join('\n');
}

function decodeDataUriToSVG(input: string): Result {
  const warnings: string[] = [];
  const original = input.trim();

  let raw: string;
  let format: Result['format'];

  // Check for data:image/svg+xml;base64, prefix
  const base64Match = original.match(
    /^data:image\/svg\+xml;base64,(.+)$/i
  );
  if (base64Match) {
    format = 'base64';
    raw = base64Match[1];
  } else {
    // Check for data:image/svg+xml;charset=utf-8, or similar URL-encoded
    const urlEncodedMatch = original.match(
      /^data:image\/svg\+xml(?:;[^,]*)?,(.+)$/i
    );
    if (urlEncodedMatch) {
      format = 'url-encoded';
      raw = urlEncodedMatch[1];
    } else {
      // Check if it looks like bare base64 (no prefix, all valid base64 chars)
      const bareBase64 = original.replace(/\s/g, '');
      if (/^[A-Za-z0-9+/]*={0,2}$/.test(bareBase64) && bareBase64.length > 20) {
        format = 'plain-base64';
        raw = bareBase64;
        warnings.push('Detected bare base64 string (no data: prefix). Attempting decode as SVG.');
      } else {
        // Check non-SVG datauri
        const mimeMatch = original.match(/^data:([^;,]+)/i);
        if (mimeMatch && !mimeMatch[1].includes('svg')) {
          throw new Error(
            `Unrecognized MIME type: "${mimeMatch[1]}". This doesn't appear to be an SVG datauri.`
          );
        }
        throw new Error(
          'Could not detect datauri format. Expected prefix: data:image/svg+xml;base64,... or data:image/svg+xml;charset=utf-8,...'
        );
      }
    }
  }

  // Fix base64 padding if needed
  if (format === 'base64' || format === 'plain-base64') {
    raw = raw.replace(/\s/g, '');
    const padding = raw.length % 4;
    if (padding === 2) {
      raw += '==';
      warnings.push('Fixed base64 padding (added ==)');
    } else if (padding === 3) {
      raw += '=';
      warnings.push('Fixed base64 padding (added =)');
    } else if (padding === 1) {
      warnings.push('Warning: base64 string has unexpected length (mod 4 = 1), decoding anyway');
    }

    // Decode base64 → UTF-8 SVG
    try {
      const binaryStr = atob(raw);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const decoder = new TextDecoder('utf-8', { fatal: true });
      raw = decoder.decode(bytes);
    } catch {
      throw new Error('Failed to decode base64. The data may be corrupted or not a valid SVG.');
    }
  } else {
    // URL-encoded: decode percent-encoding
    try {
      raw = decodeURIComponent(raw);
    } catch {
      throw new Error('Failed to URL-decode the datauri string.');
    }

    // Sometimes double-encoded
    if (raw.includes('%3C') || raw.includes('%3E') || raw.includes('%23')) {
      try {
        const doubleDecoded = decodeURIComponent(raw);
        if (doubleDecoded.includes('<svg') || doubleDecoded.includes('<SVG')) {
          raw = doubleDecoded;
        }
      } catch {
        // Single decode was correct
      }
    }
  }

  // Validate that result looks like SVG
  const cleaned = raw.trim();
  if (!cleaned.includes('<svg') && !cleaned.includes('<SVG')) {
    throw new Error(
      'Decoded content does not contain SVG markup. The datauri may not be an SVG.'
    );
  }

  // Ensure xmlns
  let svg = cleaned;
  if (!svg.includes('xmlns=')) {
    svg = svg.replace(/<svg\s/i, '<svg xmlns="http://www.w3.org/2000/svg" ');
    warnings.push('Added missing xmlns="http://www.w3.org/2000/svg"');
  }

  // Pretty-print
  const pretty = formatSVG(svg);

  return { svg: pretty, format, warnings, original };
}

// --- CLI handling ---

async function main() {
  const args = Deno.args;
  let input: string | null = null;

  const fileFlagIndex = args.indexOf('--file');
  if (fileFlagIndex !== -1 && args[fileFlagIndex + 1]) {
    const filePath = args[fileFlagIndex + 1];
    input = await Deno.readTextFile(filePath);
  } else if (!Deno.isatty(Deno.stdin.rid)) {
    const decoder = new TextDecoder();
    let buffer = new Uint8Array(0);
    const tmp = new Uint8Array(1024);
    let n: number | null;
    while ((n = await Deno.stdin.read(tmp)) !== null) {
      const newBuf = new Uint8Array(buffer.length + n);
      newBuf.set(buffer);
      newBuf.set(tmp.subarray(0, n), buffer.length);
      buffer = newBuf;
    }
    input = decoder.decode(buffer);
  } else {
    const sepIndex = args.indexOf('--');
    if (sepIndex !== -1) {
      input = args.slice(sepIndex + 1).join(' ');
    }
  }

  if (!input || !input.trim()) {
    console.error('Usage:');
    console.error('  deno run scripts/to_svg.ts -- <datauri-string>');
    console.error('  echo "data:..." | deno run scripts/to_svg.ts');
    console.error('  deno run scripts/to_svg.ts --file input.txt');
    Deno.exit(1);
  }

  try {
    const result = decodeDataUriToSVG(input);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { decodeDataUriToSVG, formatSVG };
export type { Result };
