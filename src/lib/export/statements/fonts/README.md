# Statement fonts

Bundled upstream Noto fonts, licensed under SIL OFL 1.1 (licenses alongside each family).
Fonts are embedded as subsets; export generation does not fetch fonts at runtime.

Noto Sans supplies regular/bold Latin, Greek and Cyrillic text. Noto Sans CJK
supplies Chinese, Japanese and Korean, and monochrome Noto Emoji supplies emoji.
Fallback runs retain complete grapheme clusters, including variation selectors,
skin tones and joined emoji. The variable emoji font can be subset directly by
the pinned fontkit version; no build-time conversion is required.

Font data is read lazily and cached per server process. Only fonts used by a
statement are embedded, and only their used glyphs appear in its PDF. Scripts
outside these families are rejected with their Unicode code points rather than
silently replaced by missing-glyph boxes. Adding another script requires bundling
its licensed font and adding it to the selection order in `../fonts.ts`.

| File | Source revision | SHA-256 |
| --- | --- | --- |
| NotoSans-Regular.ttf | [ffebf8c1ee44](https://raw.githubusercontent.com/notofonts/noto-fonts/ffebf8c1ee449e544955a7e813c54f9b73848eac/hinted/ttf/NotoSans/NotoSans-Regular.ttf) | `b85c38ecea8a7cfb39c24e395a4007474fa5a4fc864f6ee33309eb4948d232d5` |
| NotoSans-Bold.ttf | [ffebf8c1ee44](https://raw.githubusercontent.com/notofonts/noto-fonts/ffebf8c1ee449e544955a7e813c54f9b73848eac/hinted/ttf/NotoSans/NotoSans-Bold.ttf) | `c976e4b1b99edc88775377fcc21692ca4bfa46b6d6ca6522bfda505b28ff9d6a` |
| NotoSansCJKjp-Regular.ttf | [f8d157532fbf](https://raw.githubusercontent.com/notofonts/noto-cjk/f8d157532fbfaeda587e826d4cd5b21a49186f7c/Sans/Variable/TTF/NotoSansCJKjp-VF.ttf), converted below | `fd724c07532aad66a5beee18f293c883aeb49cc89697541a10de9618d4999e03` |
| NotoEmoji.ttf | [809e4d8b8d7e](https://raw.githubusercontent.com/google/fonts/809e4d8b8d7e9364a914909bb777679606c178b8/ofl/notoemoji/NotoEmoji%5Bwght%5D.ttf) | `de6c18832938afc99caf132b39d6a30a19bac7f2e812e28db2535b4608d27551` |

## Reproducing the CJK font

The CJK asset is a static regular-weight TrueType instance, created offline with
fontTools **4.60.1**. Its upstream variable TTF has SHA-256
`240c9b83bf7b386edbae39995ae7e068ed4583f484d92e4a74c34158b5f27b1a`.
Run these commands from the repository root:

```sh
python3 -m venv /tmp/wildcat-fonts-env
/tmp/wildcat-fonts-env/bin/pip install fonttools==4.60.1
curl -fsSL https://raw.githubusercontent.com/notofonts/noto-cjk/f8d157532fbfaeda587e826d4cd5b21a49186f7c/Sans/Variable/TTF/NotoSansCJKjp-VF.ttf -o /tmp/NotoSansCJKjp-VF.ttf
/tmp/wildcat-fonts-env/bin/python - <<'PY'
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

font = TTFont('/tmp/NotoSansCJKjp-VF.ttf', recalcTimestamp=False)
instantiateVariableFont(font, {'wght': 400}, inplace=True, updateFontNames=True)
font['glyf'].padding = 4
font.save('src/lib/export/statements/fonts/NotoSansCJKjp-Regular.ttf')
PY
shasum -a 256 src/lib/export/statements/fonts/NotoSansCJKjp-Regular.ttf
```

Use TrueType outlines: the pinned PDF/fontkit combination produces invalid CFF
subsets from the OTF version. Aligning TrueType glyph data to four-byte boundaries
also ensures fontkit's compact subset offsets preserve every outline. The tests
decode every embedded glyph, in addition to checking Unicode mappings and byte
determinism. Visual QA with Poppler must render Japanese, Chinese and Korean
without font warnings, substitutions or blank glyphs.
