# MIME & Encoding Reference

## DataURI Format Specification

```
data:[<mediatype>][;base64],<data>
```

**RFC 2397** — The "data" URL scheme.

## SVG MIME Types

| Context | MIME Type |
|---|---|
| Standard SVG | `image/svg+xml` |
| SVG in XML context | `image/svg+xml` |
| SVG in HTML (inline) | No MIME needed (parsed as HTML) |

## Allowed DataURI Variants for SVG

| Variant | Example Prefix |
|---|---|
| Base64 | `data:image/svg+xml;base64,PHN2Zy...` |
| URL-encoded UTF-8 | `data:image/svg+xml;charset=utf-8,%3Csvg...` |
| URL-encoded (no charset) | `data:image/svg+xml,%3Csvg...` |

## Characters That Need Encoding in URL-encoded DataURI

| Character | Encoded | Reason |
|---|---|---|
| `#` | `%23` | Fragment identifier |
| `%` | `%25` | Escape character |
| `<` | `%3C` | May be interpreted as HTML |
| `>` | `%3E` | May be interpreted as HTML |
| `"` | `%22` | May break HTML attribute |
| `{` | `%7B` | Template literal in some contexts |
| `}` | `%7D` | Template literal in some contexts |
| space | `%20` | Whitespace |

## Base64 Padding Rules

- Length mod 4 = 0: no padding needed
- Length mod 4 = 1: invalid (will fail to decode)
- Length mod 4 = 2: add `==`
- Length mod 4 = 3: add `=`

## Key Differences Between the Two DataURI Formats

| Aspect | Base64 | URL-encoded (UTF-8) |
|---|---|---|
| Size | ~33% larger than original SVG | ~same size + encoding overhead |
| Readability | Not human-readable | Partially readable |
| Browser support | Universal | Universal |
| CSS `background-image` | Works | Works (but more brittle) |
| `<img src="...">` | Works | Works |
| `<iframe srcdoc="...">` | N/A | Better (no decoding needed) |

## Practical Limits

| Context | Limit |
|---|---|
| IE 8-11 URL max length | ~32KB (applied to datauri in CSS) |
| Modern browsers (Chrome, FF, Safari) | ~2MB for datauri in images |
| Email clients | ~100KB safe limit |
| CSS file best practice | < 10KB per datauri for performance |
