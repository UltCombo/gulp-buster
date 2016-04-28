# Changelog

## 1.0.0 The Promised Hashing

### Breaking changes

- The `config` method has been removed, you can now pass a configuration options object in the `bust()` call. See the [docs](https://github.com/UltCombo/gulp-buster/#syntax) for details.
- Removed the undocumented experimental `mode` option, use the new `transform` option instead.
- Removed the undocumented `hashes` method.

### Patch releases

- **1.0.1**: Fixed a bug in the crypto hashing logic that would give wrong hash results sometimes, mainly when hashing binary files. Also added official support for Node.js versions 0.12, 4, 5 and 6! (in addition to version 0.10 which was already supported)
- **1.0.2**: Updated dependencies and cleaned up the code style.

### New features

- Configuration options: added new `formatter` and `transform` options, added support for `algo` as a function and negative `length`. See the [docs](https://github.com/UltCombo/gulp-buster/#parameters) for details.
- All of the configuration options which accept a function can be run asynchronously by returning a promise.
- Added type validation for configuration options.

## 0.2.0 Multidimensional Configurable Hashing Abyss

- `fileName` parameter is now optional and defaults to `busters.json`.
- Allow multiple different output files in the same script (hashes are grouped by output filename).
- Added `.config()` method to allow customizing the hashing algorithm, hash length and default output filename.

### Patch releases

- **0.2.1**: Readme: Fixed miscellaneous typos, including config sample.
- **0.2.2**: Fixed crash when piping an empty buffer stream into gulp-buster. Many documentation improvements: added cache busting explanation, improved syntax and architecture documentation, added 3rd-party implementations listing and contributing guide.

## 0.1.0 Bustering Gulpness

- Initial release.
