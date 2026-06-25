# Edge Cases & Troubleshooting

## SVG Content Issues

### Missing xmlns
```svg
<!-- BROKEN — won't render in datauri -->
<svg viewBox="0 0 100 100">...</svg>

<!-- FIXED -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">...</svg>
```

### XML Declaration Present
```svg
<?xml version="1.0" encoding="UTF-8"?>
<svg ...>...</svg>
```
Strip the `<?xml?>` declaration before encoding to datauri. It's unnecessary and can cause issues in CSS contexts.

### CDATA Sections
```svg
<style>
/*<![CDATA[*/
  .cls-1 { fill: red; }
/*]]>*/
</style>
```
CDATA markers can be removed after SVG decode; they're only needed for XML parsing.

### External Resources
SVGs referencing external images, fonts, or other SVGs by URL won't render those resources when used as a datauri. Inline them:

```svg
<!-- BEFORE (won't work in datauri) -->
<image href="external.png" width="100" height="100"/>

<!-- AFTER (inline) -->
<image href="data:image/png;base64,iVBORw0KGgo..." width="100" height="100"/>
```

## DataURI Parsing Issues

### Double-encoded datauri
Some tools encode the URL twice:
```
data:image/svg+xml;charset=utf-8,%253Csvg...
                                     ^^ -- this is a double-encoded '%'
```
The decoder should attempt double-decode if the first pass leaves encoded characters.

### Non-standard prefixes
Some contexts produce non-standard prefixes:
- `data:image/svg+xml;utf8,` (missing charset=)
- `data:image/svg;base64,` (missing +xml)
- `data:;base64,` (missing MIME entirely — commonly output by buggy tools)

Handle these gracefully with warnings.

### Whitespace in base64
Base64 datauris sometimes contain newlines or spaces from word-wrapping. Strip whitespace before decoding.

## Browser-Specific Behavior

### Safari
- Safari is strict about SVG namespace. Always ensure `xmlns="http://www.w3.org/2000/svg"`.
- Safari may not render SVGs with external font references in datauri format.

### Firefox
- Firefox supports larger datauris than other browsers (up to ~2MB).
- Firefox handles the `charset=utf-8` variant correctly but prefers `base64`.

### Chrome/Edge
- Chrome rejects datauris in `Set-Cookie` and `document.cookie` — this is expected.
- Edge (Chromium) behaves identically to Chrome.

### IE 11 (for reference)
- Datauri max length: ~32KB when used in CSS.
- IE does not support datauri for `<script src>` or `<link rel="stylesheet">`.

## CSS Context Gotchas

When embedding SVG datauri in CSS:

```css
/* Works reliably across browsers */
background-image: url("data:image/svg+xml;base64,PHN2Zy...");

/* More compact but may have encoding issues */
background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg...");

/* For CSS, single-quote the attribute values in SVG to avoid conflict */
/* BAD: double quotes inside double quotes
   url("data:...<svg x="1">...")
   GOOD: single quotes inside double quotes (or vice versa)
   url("data:...<svg x='1'>...")
*/
```
