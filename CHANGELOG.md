# Changelog

## 0.2.0 Multidimensional Configurable Hashing Abyss

- `fileName` parameter is now optional and defaults to `busters.json`;
- Allow multiple different output files in the same script (hashes are grouped by output filename);
- Added `.config()` method to allow customizing the hashing algorithm, hash length and default output filename.

### Patch releases

- **0.2.1**: Readme: Fixed miscellaneous typos, including config sample.
- **0.2.2**: Fixed crash when piping an empty buffer stream into gulp-buster. Many documentation improvements: added cache busting explanation, improved syntax and architecture documentation, added 3rd-party implementations listing and contributing guide.

## 0.1.0 Bustering Gulpness

- Initial release.
