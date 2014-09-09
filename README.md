# [gulp](https://github.com/gulpjs/gulp/)-buster
[![NPM version](https://badge.fury.io/js/gulp-buster.png)](https://npmjs.org/package/gulp-buster)
[![Build Status](https://travis-ci.org/UltCombo/gulp-buster.png?branch=master)](https://travis-ci.org/UltCombo/gulp-buster)
[![Dependency Status](https://david-dm.org/UltCombo/gulp-buster.png)](https://david-dm.org/UltCombo/gulp-buster)
[![devDependency Status](https://david-dm.org/UltCombo/gulp-buster/dev-status.png)](https://david-dm.org/UltCombo/gulp-buster#info=devDependencies)

Cache buster hashes generator for gulp

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

gulp-buster can be used standalone as part of a build task, or in conjunction with [`gulp-watch`](https://npmjs.org/package/gulp-watch) to update the cache buster hashes as the files are modified.

Example with `gulp-watch`:

```js
var gulp = require('gulp'),
	watch = require('gulp-watch'),
	bust = require('gulp-buster');

gulp.task('default', function() {
	return gulp.src([
		'**/*.min.js',
		'css/*.css'
		]).pipe(watch(function(files) {
			return files
				.pipe(bust('busters.json')) // the output filename
				.pipe(gulp.dest('.')); // output file to project root
		}));
});
```

## Syntax

```none
<through stream> bust([fileName])
```

### Parameters

- `fileName` (string, optional): the output JSON file's name (with extension). The default is `busters.json`, which can also be changed through the `.config()` method (see below).

## Configs

You can set global configurations such as the hash algorithm and length (as well as the output `fileName`, which is useful when using a custom output filename and multiple entry points, more on that later) by calling the `.config()` method. It is very jQuery-y:

```js
var bust = require('gulp-buster');

// accepts an object as setter
bust.config({
	algo: 'sha1',
	length: 6
});

// pass two arguments to set the value for a single config
bust.config('length', 8);

// and of course, pass a single string to retrieve the given config's value
var lengthLimit = bust.config('length'); // 8

// pass no arguments to retrieve the current configs object
var configs = bust.config(); // { fileName: 'busters.json', algo: 'sha1', length: 8 [, ...] }
// NOTE: this returns a reference to the actual config object, so it is possible (but not advisable)
// to edit the plugin's configs by assigning to this object's properties.
```

### Available configurations

- `fileName` (string): the filename to be used when no `fileName` argument is specified in a `bust()` call. Defaults to `'busters.json'`.
- `algo` (string|function): the hashing algorithm to be used. As a string, it accepts the same algorithms as [`crypto.createHash`](http://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm). As a function, it takes a [vinyl file](https://github.com/wearefractal/vinyl) as the first argument and must return a string. Defaults to `'md5'`.
- `length` (number): the maximum length of the hash. If specified, only the leading characters of the hash (up to `length`) will be returned. Defaults to `0`, which means no limit (actual length will then depend on the hashing algorithm used). Specifying a length larger than the hash will have no effect.
- `formatter` (function): the function responsible for serializing the hashes object into the string content of the output file. It takes the hashes object (a plain object in the `filePath: hash` format) as the first argument, and must return a string. Defaults to `JSON.stringify`.

## Integrating with Web applications

gulp-buster is language-agnostic, thus this part relies on you and your specific use case. gulp-buster generates a JSON file in the following format:

```js
{
	"path/to/file/relative/to/project/root/filename.ext": "hash",
	//other entries
}
```

Integration can be easily achieved on any language which supports JSON parsing, in either back-end or front-end. See the [Implementations page](https://github.com/UltCombo/gulp-buster/blob/master/IMPLEMENTATIONS.md) for examples and existing solutions for your language of choice.

## Architecture

gulp-buster groups hashes by the output `fileName`. That means, piping two different streams into `bust('foo.json')` will merge both of those streams' files' hashes into the same output file (obviously, you should then set both streams' `.dest()` to the same path in order to don't create duplicated output files). Likewise, in case you'd like two streams' files to have their hashes outputted to different files, you must use different filenames (and set their `.dest()` to your liking).

When gulp-buster is initialized, it creates an empty object which serves as a cache for the generated hashes. This approach's main pros are:

- Allows piping only modified files into gulp-buster, the other hashes are retrieved from the cache when generating the output file;
- Deleted files' hashes are automatically cleaned on startup, as the hashes cache object starts empty on every startup.

There are close to no cons, the only notable drawback is that all the to-be-busted files must be piped into gulp-buster (preferably at startup) before it generates the output file with all hashes that you'd expect. A feature to allow inputting an already-generated hashes file was considered in order to avoid having to pipe all the to-be-busted files at startup, but that seems to bring more cons than pros -- the auto-cleanup of deleted files' hashes would no longer happen, outdated hashes could stay in the output hashes file if the to-be-busted files were edited while gulp was not running, and finally it'd also be incompatible with currently planned features (output `transform` and `formatter`).

## Changelog

[Available here.](https://github.com/UltCombo/gulp-buster/blob/master/CHANGELOG.md)

## FAQ

**Q. Is the correct name Gulp-Buster, gulp-buster or Gulp-buster?**<br>
The name is always lowercase, matching the npm package name.
