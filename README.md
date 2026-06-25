# svg2base64

SVG ↔ Base64 DataURI bidirectional conversion — a Claude Code skill.

## Installation

```bash
# claude code
claude skill add github:brickhu/svg2base64

# other way:
npx agent-skill-manager install brickhu/svg2base64
```

## Usage

In Claude Code, simply:

- Paste SVG code + "to base64" → get DataURI
- Paste DataURI + "to svg" → get pretty SVG
- Upload SVG file + "convert" → get DataURI

## CLI

```bash
npx svg2base64 '<svg>...</svg>'           # SVG → DataURI
echo '<svg>...</svg>' | npx svg2base64     # pipe SVG → DataURI
npx svg2base64 decode 'data:...'          # DataURI → SVG
npx svg2base64 --file input.svg           # SVG file → DataURI
npx svg2base64 install                    # Install as Claude Code skill
```

## Author

[Brickhu](https://github.com/brickhu)

## License

MIT
