# [gulp](https://github.com/gulpjs/gulp/)-buster
[![NPM version](https://badge.fury.io/js/gulp-buster.png)](https://npmjs.org/package/gulp-buster)
[![Build Status](https://travis-ci.org/UltCombo/gulp-buster.png?branch=master)](https://travis-ci.org/UltCombo/gulp-buster)
[![Dependency Status](https://david-dm.org/UltCombo/gulp-buster.png)](https://david-dm.org/UltCombo/gulp-buster)
[![devDependency Status](https://david-dm.org/UltCombo/gulp-buster/dev-status.png)](https://david-dm.org/UltCombo/gulp-buster#info=devDependencies)

Cache buster hashes generator for gulp

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

## Parameters

- `fileName` (first parameter, string or `undefined`, optional): the output JSON file's name (with extension). The default is `busters.json`, which can also be changed through the `.config()` method (see below).

## Configs

You can set global configurations such as the hash algorithm and length (as well as the output `fileName`, which is useful when using a custom output filename and multiple entry points, more on that later) by calling the `.config()` method. It is very jQuery-y:

```js
var bust = require('gulp-buster');

// accepts an object as setter
bust.config({
	hash: 'sha1',
	length: 6
});

// pass no arguments to retrieve the current configs object
var configs = bust.config(); // { fileName: 'busters.json', hash: 'sha1', length: 6 [, ...] }
// NOTE: this returns a reference to the actual config object, so it is possible (but not advisable)
// to edit the plugin's configs by assigning to this object's properties.

// pass two arguments to set the value for a single config
bust.config('length', 8);

// and of course, pass a single string to retrieve the given config's value
var lengthLimit = bust.config('length'); // 8
```

### Available configurations

- `fileName` (string): the filename to be used when no `fileName` argument is specified in a `bust()` call. Defaults to `busters.json`.
- `algo` (string): the hashing algorithm to be used. Defaults to `md5`. Accepts the same algorithms as [`crypto.createHash`](http://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm).
- `length` (number): the maximum length of the hash. If specified, only the leading characters of the hash (up to `length`) will be returned. Defaults to `0`, which means no limit (actual length will then depend on the hashing algorithm used). Specifying a length larger than the hash will have no effect.

## Multiple streams - single and multiple output files

gulp-buster groups hashes by the output `fileName`. That means, piping two different streams into `bust('foo.json')` will merge both of those streams' files' hashes into the same output file (obviously, you should then set both streams' `.dest()` to the same path to don't create duplicated output files). Likewise, in case you'd like two streams' files to have their hashes outputted to different files, simply pass different filenames (and set their `.dest()` to your liking).

## Integrating with Web applications

gulp-buster is language-agnostic, thus this part relies on you and your specific use case. gulp-buster generates a JSON file in the following format:

```js
{
	"path/to/file/relative/to/project/root/filename.ext": "File's MD5 hash",
	//other entries
}
```

Integration can be easily achieved on any language which supports JSON parsing, in either back-end or front-end. Here's a Node.js example:

**asset-loader.js**
```js
var busters = require('path/to/busters.json');
module.exports = function(path) {
	return path + (busters[path] ? '?' + busters[path] : '');
};
```

Then when outputting cache-busted file paths, simply call the asset loader passing the (relative to project root) file path. Example with Express and Jade:

```jade
script(src=fooSrc)
```

```js
var asset = require('./asset-loader.js');
res.render('view', { fooSrc: '/' + asset('js/min/foo.min.js') }, function(err, html) {
	// ...
});
```

As you can see, the gulp-buster `busters.json`'s paths are relative to project root without the leading slash, so we manually prepend a `/` to the cache-busted URL. This works nicely if your project root corresponds to the web server root. Otherwise, you will have to prepend the correct base URL. The optimal way would be to dynamically retrieve your app's base URL, specially as the project path relative to the web server root may differ between production and local development environments (e.g. it is a common scenario to have the project run at `/` in the production server and at `/myProject/` in local development).

There are many ways to implement this in the front-end as well. If using an AMD loader such as Require.js, you can map modules to cache-busted URLs in the config. Even without any loader, it is possible to `document.write` the scripts as follows:

```js
['app', 'services', 'controllers', 'filters', 'directives'].forEach(function(s) {
	document.write('<script src="/' + asset('js/' + s + '.js') + '"><\/script>');
});
```

**Note:** If implementing this in the front-end, make sure to load the fresh (non-cached) `busters.json` file. That is, retrieving it through an Ajax request may return a cached version of it depending on the server configurations. Append a timestamp to the request URL's querystring to prevent caching issues. You may also output the JSON file's contents inside of a dynamic page's `<script>` tag assigning it to a variable. JSON (JavaScript Object Notation) is a subset of the JS object/array literals syntax, so this is perfectly valid as well.

As the asset loader implementation is up to you, you may make it the way which better fits your application. My personal implementation checks the file extension (js/css/png) and returns the full HTML tag for it, accepts string/array of strings overloading for the path argument, and also takes the base path as an optional argument.

You may publish your own gulp-buster asset loaders in GitHub and contact me by [opening an issue](https://github.com/UltCombo/gulp-buster/issues/new) in this repository in case you'd like your asset loader to be published here. Make sure to include clear how to use instructions in the readme file of your asset loader's repository.

## Changelog

[Available here.](https://github.com/UltCombo/gulp-buster/blob/master/CHANGELOG.md)

## FAQ

**Q. Is the correct name gulp-buster, gulp-buster or gulp-Buster?**
The name is always lowercase, matching the npm package name.

**Q. I am having issues with watch mode, what am I doing wrong?**
It is strongly advised to use the [`gulp-watch`](https://npmjs.org/package/gulp-watch) plugin for piping files into gulp-buster. Other watchers may not pipe all source files when starting the task and thus causes gulp-buster to not create the initial in-memory hashes cache of all tracked files.
