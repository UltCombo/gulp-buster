# [gulp](https://github.com/gulpjs/gulp/)-buster
[![npm version](http://img.shields.io/npm/v/gulp-buster.svg)](https://npmjs.org/package/gulp-buster)
[![Build Status](http://img.shields.io/travis/UltCombo/gulp-buster.svg)](https://travis-ci.org/UltCombo/gulp-buster)
[![Coverage Status](https://img.shields.io/coveralls/UltCombo/gulp-buster.svg)](https://coveralls.io/r/UltCombo/gulp-buster)
[![Dependency Status](http://img.shields.io/david/UltCombo/gulp-buster.svg)](https://david-dm.org/UltCombo/gulp-buster)
[![devDependency Status](http://img.shields.io/david/dev/UltCombo/gulp-buster.svg)](https://david-dm.org/UltCombo/gulp-buster#info=devDependencies)

Cache buster hashes generator for gulp. Blazing fast and fully configurable.

## What is cache busting?

It is basically a way to expire a given resource.

As a mean to optimize web applications, it is recommended to set assets' expiration date to a long time in the future (usually one month to one year). This way, the browser can load the cached resources from the local disk rather than over the network.

But of course, that also means the browser won't even attempt to load a resource from the network while it has a non-expired cached version of the given resource, even if that resource has been modified in the server. Then, how to invalidate this cached resource and force the browser to load the new version?

Here enters cache busting, also known as "fingerprinting", as described in [Optimize Caching - Google Developers](https://developers.google.com/speed/docs/best-practices/caching):

> For resources that change occasionally, you can have the browser cache the resource until it changes on the server, at which point the server tells the browser that a new version is available. You accomplish this by embedding a fingerprint of the resource in its URL (i.e. the file path). When the resource changes, so does its fingerprint, and in turn, so does its URL. As soon as the URL changes, the browser is forced to re-fetch the resource. Fingerprinting allows you to set expiry dates long into the future even for resources that change more frequently.

**Note:** Even if you are not explicitly setting expiration headers, browsers are allowed to and **will** cache assets such as CSS and image files. This means, without proper cache busting, your clients may get broken pages (e.g. updated markup with outdated styling and images which were automatically cached by the browser) even if your server does not send caching headers! (which it should send anyway)

Of course, technically, the caching issue could be worked around if every client refreshes the page, but that is not obvious to every user and, obviously, it would provide a terrible user experience and negatively affect the overall image of your product. And you don't want that, right? `;)`

## Install

First off, [install gulp](https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md).

Then install gulp-buster as a development dependency:

```
npm install --save-dev gulp-buster
```

## How to use

gulp-buster can be used standalone as part of a build task, or in conjunction with [gulp-watch](https://npmjs.org/package/gulp-watch) to update the cache buster hashes as the files are modified.

Example with gulp-watch `^1.0.5` and gulp-ruby-sass `^0.7.1` (compile, bust and watch for changes):

```js
var gulp = require('gulp'),
	watch = require('gulp-watch'),
	sass = require('gulp-ruby-sass'),
	bust = require('gulp-buster');

gulp.task('default', function() {
	var srcGlob = 'scss/*.scss';
	return gulp.src(srcGlob)
		.pipe(watch(srcGlob, function(files) {
			return files
				.pipe(sass())
				.pipe(gulp.dest('css'))
				.pipe(bust())           // pipe generated files into gulp-buster
				.pipe(gulp.dest('.'));  // output busters.json to project root
	}));
});
```

## Syntax

```none
<through stream> bust([options])
```

### Parameters

- `options` (object|string, optional): the configuration options object. Passing `options` as a string is treated as `{ fileName: options }`.

- `options.fileName` (string, optional): the output filename. Defaults to `'busters.json'`.

- `options.algo` (string|function, optional): the hashing algorithm to be used. As a string, it accepts the same algorithms as [`crypto.createHash`](http://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm). As a function, it takes a [vinyl file](https://github.com/wearefractal/vinyl) as the first argument and must return a string. Defaults to `'md5'`.

- `options.length` (number, optional): the maximum length of the hash. Specifying a positive `length` will return the given number of leading characters of the hash, and a negative `length` will return the given number of trailing characters. Defaults to `0`, which means no limit (actual length will then depend on the hashing algorithm used). Specifying a length larger than the hash will have no effect.

- `options.transform` (function, optional): allows mutating the hashes object, or even creating a completely new data structure, before passing it to the `formatter`. It takes a copy of the hashes object (a plain object in the `filePath: hash` format) as the first argument and must return a value compatible with the `formatter` option. Defaults to passing through the hashes object.

- `options.formatter` (function, optional): the function responsible for serializing the hashes data structure into the string content of the output file. It takes the value returned from the `transform` function as the first argument and must return a string. Defaults to `JSON.stringify`.

**Note:** all of the options which accept a function can be run asynchronously by returning a promise (or *thenable*). If the given option has a return value constraint, the constraint will still be applied to the promise's fulfillment value.

## Integrating with Web applications

gulp-buster is language-agnostic, thus this part relies on you and your specific use case. By default, gulp-buster generates a JSON file in the following format:

```js
{
	"path/to/file/relative/to/project/root/filename.ext": "hash",
	//other entries
}
```

Integration can be easily achieved on any language which supports JSON parsing, in either back-end or front-end. See the [Implementations page](https://github.com/UltCombo/gulp-buster/blob/master/IMPLEMENTATIONS.md) for examples and existing solutions for your language of choice.

**Note:** The output file contents' data structure and format can be customized through the [configuration options](#parameters). This enables gulp-buster to output the cache buster hashes file in a suitable native data structure for your target language, as well as allowing to mutate the paths and hashes to suit your specific needs.

## Architecture

When gulp-buster is initialized, it creates an empty object which serves as a cache for the generated hashes. Generated hashes are then grouped by the `options.fileName` parameter. That means, piping two different streams into `bust('foo.json')` will merge both of those streams' files' hashes into the same output file. This approach's main pros are:

- Allows piping only modified files into gulp-buster, the other hashes are retrieved from the cache when generating the output file;
- Deleted files' hashes are automatically cleaned on startup, as the hashes cache object starts empty on every startup;
- Although this feature is very similar to [gulp-remember](https://github.com/ahaurw01/gulp-remember), gulp-buster's hashes cache is much more efficient. Using gulp-remember would cause all of the files that have ever went through the stream to be re-hashed whenever piping any new file, unlike gulp-buster's hashes cache which allows hashing only the files that are piped into gulp-buster.

There are close to no cons, the only notable drawback is that all the to-be-busted files must be piped into gulp-buster (preferably at startup) before it generates the output file with all hashes that you'd expect. A feature to allow inputting an already-generated hashes file was considered in order to avoid having to pipe all the to-be-busted files at startup, but that seems to bring more cons than pros -- the auto-cleanup of deleted files' hashes would no longer happen, outdated hashes could stay in the output hashes file if the to-be-busted files were edited while gulp was not running, and finally it'd also be incompatible with the `transform` and `formatter` features.

## Changelog

[Available here.](https://github.com/UltCombo/gulp-buster/blob/master/CHANGELOG.md)

## FAQ

**Q. Is the correct name Gulp-Buster, gulp-buster or Gulp-buster?**<br>
The name is always lowercase, matching the npm package name.
