# Terminal Compatibility

TOADSTOOL targets modern terminals with 256-color and UTF-8 support. If you run into glyph or
color issues:

- Ensure `TERM=xterm-256color`.
- Run `toadstool --setup` and source the generated script.
- Force ASCII glyphs with `TOADSTOOL_ASCII=true`.

For high-contrast output, switch to the **High Contrast** theme in the theme selector.
