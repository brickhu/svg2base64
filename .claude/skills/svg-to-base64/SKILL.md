---
name: svg-to-base64
description: >-
  SVG ↔ Base64 DataURI bidirectional conversion tool. Invoke when user pastes
  SVG code or uploads SVG files and says "to base64", "to datauri", "转换base64",
  "convert to datauri", or pastes a datauri string and mentions "svg", "convert
  to svg", "还原svg", "decode". Detects input format automatically — SVG code,
  SVG file references, or datauri strings — and performs the correct conversion.
when_to_use: >-
  User provides SVG markup and wants a datauri, user provides a datauri and wants
  SVG markup, user uploads an SVG file and wants a datauri, or user pastes any
  SVG/datauri content with conversion intent. Also triggers on phrases like
  "转成base64", "转datauri", "datauri转svg", "base64解码".
metadata:
  type: conversion
  version: 1.0.0
  author: Brickhu
  repo: https://github.com/Brickhu/skill_svg_to_base64
  license: MIT
---

# SVG ↔ Base64 DataURI Skill

Convert between SVG markup and Base64-encoded DataURI strings bidirectionally.

## Core Behavior

1. **Auto-detect input type** — is it raw `<svg>` markup, an SVG file path, or a Base64 datauri?
2. **Perform conversion** — use the provided scripts or inline logic
3. **Output both formats** — show the result and copy-ready output

## Input Detection Rules

| Input Pattern | Detection | Action |
|---|---|---|
| Starts with `<svg` or `<?xml` containing `<svg` | Raw SVG markup | Convert to datauri |
| Ends with `.svg` or user says "this SVG file" | SVG file path | Read file, convert to datauri |
| Starts with `data:image/svg+xml;base64,` or `data:image/svg+xml,` | Base64 datauri | Decode to SVG |
| Starts with a long Base64 string (no `data:` prefix) | Assume bare base64 of SVG | Decode to SVG |

## SVG → DataURI Conversion Process

When converting SVG to datauri, follow these steps:

1. **Strip unnecessary whitespace**: collapse SVG to a single line (but preserve structural integrity)
2. **Apply URL encoding**: encode the SVG string for datauri embedding:
   - `#` → `%23`
   - `%` → `%25` (only when not already a valid existing encoding)
   - `"` → `'` (single quotes preferred for attribute values to reduce encoding)
   - `<` → `%3C` (only if needed for the specific use case)
   - `>` → `%3E` (only if needed)
3. **Construct the datauri**: prepend `data:image/svg+xml;charset=utf-8,` followed by the URL-encoded SVG
4. **Also provide base64 variant**: prepend `data:image/svg+xml;base64,` with standard base64 of the UTF-8 encoded SVG string

Always output **both** the URL-encoded and Base64-encoded variants so the user can choose.

## DataURI → SVG Conversion Process

1. Strip the `data:image/svg+xml;base64,` or `data:image/svg+xml;charset=utf-8,` prefix
2. If base64: decode the base64 string to UTF-8 SVG text
3. If URL-encoded: decode the percent-encoding back to raw SVG
4. Pretty-print the SVG with proper indentation for readability
5. Output the decoded SVG code block

## Output Format

Always present output in this structure:

````
**🔷 URL-encoded DataURI:**
```text
data:image/svg+xml;charset=utf-8,%3Csvg%20...
```

**🔷 Base64 DataURI:**
```text
data:image/svg+xml;base64,PHN2Zy...
```

**🔷 SVG (pretty):**
```svg
<svg ...>
  ...
</svg>
```
````

Show all three sections. For SVG→DataURI direction, highlight the two datauri variants. For DataURI→SVG direction, highlight the pretty SVG. Add a one-click copy hint if running in a terminal with pbcopy/xclip.

## Edge Cases

- **SVG with external references** (`<image href="...">`, external fonts): warn user that external resources won't render in a datauri context and suggest inlining them
- **Very large SVGs** (>100KB raw): warn about datauri size limits (IE limit ~32KB, general practical limit ~100KB). Suggest hosting as a file instead
- **SVG with `<?xml ...?>` declaration**: strip it before encoding for datauri (not necessary and causes issues in CSS contexts)
- **SVG with `xmlns` missing**: add `xmlns="http://www.w3.org/2000/svg"` — required for valid datauri rendering
- **Datauri with `font-weight="normal"` style quirks**: some tools quote font-weight, which can break rendering; leave a note
- **Non-SVG datauri provided**: detect by checking the MIME type in the datauri prefix; reject with a clear error message
- **Invalid base64 padding**: auto-fix with `=` padding if the length is wrong, and note the fix

## Usage Examples

### SVG → DataURI
> User: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>`
> → Convert to datauri (both URL-encoded and base64 variants)

### DataURI → SVG
> User: `data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiLz48L3N2Zz4=`
> → Decode to pretty-printed SVG

### SVG File → DataURI
> User uploads `icon.svg` or says "convert this SVG file to base64"
> → Read file content, convert to both datauri variants

## Scripts

This skill ships with helper scripts in the `scripts/` directory. For complex or repeated conversions, the implementation in the scripts should be used. The scripts handle all edge cases including encoding, validation, and pretty-printing.

- `scripts/to_datauri.ts` — SVG markup → DataURI (both URL-encoded and Base64 variants)
- `scripts/to_svg.ts` — DataURI → pretty-printed SVG markup
