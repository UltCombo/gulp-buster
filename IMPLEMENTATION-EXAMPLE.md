# Implementation examples

These examples explain the basic logic necessary to implement gulp-buster into your application.

## Node.js + Jade

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

## Client-side

There are many ways to implement this in the front-end as well. If your project uses an AMD loader such as Require.js, you can map the modules to their cache-busted URLs in the config. Even without any loader, it is possible to `document.write` the scripts as follows:

```js
['app', 'services', 'controllers', 'filters', 'directives'].forEach(function(s) {
	document.write('<script src="/' + asset('js/' + s + '.js') + '"><\/script>');
});
```

**Note:** If implementing this in the front-end, make sure to load the fresh (non-cached) `busters.json` file. That is, retrieving it through an Ajax request may return a cached version of it depending on the server configurations. Append a timestamp to the request URL's querystring to prevent caching issues. You may also output the JSON file's contents inside of a dynamic page's `<script>` tag assigning it to a variable. JSON (JavaScript Object Notation) is a subset of the JS object/array literals syntax, so this is perfectly valid as well.

## Closing words

As the asset loader implementation is up to you, you may make it the way which better fits your application. A more robust implementation could check the file extension (js/css/png) and return the full HTML tag for it, accept string/array of strings overloading for the path argument, and also take the base path as an optional argument.
