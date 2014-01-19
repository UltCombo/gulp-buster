# [gulp](https://github.com/gulpjs/gulp/)-buster [![Build Status](https://travis-ci.org/UltCombo/gulp-buster.png?branch=master)](https://travis-ci.org/UltCombo/gulp-buster)

Cache buster hashes generator for gulp

## Install

First off, [install gulp](https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md).

Then install gulp-buster as a development dependency:

```
npm install --save-dev gulp-buster
```

## Using

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

`fileName` (first parameter): the output JSON file's name (with extension).

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

As you can see, the gulp-buster `busters.json`'s paths are relative to project root without the leading slash, so we manually prepend a `/` to the cache-busted URL. This works nicely if your project root corresponds to the web server root. Otherwise, you will have to prepend the correct base URL - the optimal way would be to dynamically retrieve your app's base URL, specially if your local development server and production server's directory path differs (e.g. it is a common scenario to have production server run at `/` while local development server at `/myProject/`).

There are many ways to implement this in the front-end as well. If using an AMD loader such as Require.js, you can map modules to cache-busted URLs in the config. Even without any loader, it is possible to `document.write` the scripts as follows:

```js
['app', 'services', 'controllers', 'filters', 'directives'].forEach(function(s) {
	document.write('<script src="/' + asset('js/' + s + '.js') + '"><\/script>');
});
```

**Note:** If implementing this in the front-end, make sure to load the fresh (non-cached) `busters.json` file. That is, retrieving it through an Ajax request may return a cached version of it depending on the server configurations. Append a timestamp to the request URL's querystring to prevent caching issues. You may also output the JSON file's contents inside of a dynamic page's `<script>` tag assigning it to a variable. JSON (JavaScript Object Notation) is a subset of the JS object/array literals syntax, so this is perfectly valid as well.

As the asset loader implementation is up to you, you may make it the way which better fits your application. My personal implementation checks the file extension (js/css/png) and returns the full HTML tag for it, accepts string/array of strings overloading for the path argument, and also takes the base path as an optional argument.

You may publish your own gulp-buster asset loaders in GitHub and contact me by [opening an issue](https://github.com/UltCombo/gulp-buster/issues/new) in this repository in case you'd like your asset loader to be published here. Make sure to include clear how to use instructions in the readme file of your asset loader's repository.

## FAQ

**Q. Is the correct name gulp-buster, gulp-buster or gulp-Buster?**
The name is always lowercase, matching the npm package name.

**Q. I am having issues with watch mode, what am I doing wrong?**
It is strongly advised to use the [`gulp-watch`](https://npmjs.org/package/gulp-watch) plugin for piping files into gulp-buster. Other watchers may not pipe all source files when starting the task and thus causes gulp-buster to not create the initial in-memory hashes cache of all tracked files.
