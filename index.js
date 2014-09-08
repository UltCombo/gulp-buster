'use strict';

var PLUGIN_NAME = 'gulp-buster',
	crypto = require('crypto'),
	path = require('path'),
	es = require('event-stream'),
	gutil = require('gulp-util'),
	File = gutil.File,
	PluginError = gutil.PluginError,
	defaultConfig = {
		fileName: 'busters.json',
		algo: 'md5',
		length: 0,
		formatter: JSON.stringify,
	},
	config = extend({}, defaultConfig),
	hashes = {};

// a simple, shallow object extend function
function extend(dest, src) {
	Object.keys(src).forEach(function(key) {
		dest[key] = src[key];
	});
	return dest;
}

function hash(file) {
	var ret = typeof config.algo === 'function'
		? config.algo(file) // TODO emit error when returned value is not a string
		: crypto.createHash(config.algo).update(file.contents.toString()).digest('hex');

	return config.length ? ret.substr(0, config.length) : ret;
}

function relativePath(projectPath, filePath) {
	return path.relative(projectPath, filePath).replace(/\\/g, '/');
}

module.exports = function(fileName) {
	fileName = fileName || config.fileName;
	hashes[fileName] = hashes[fileName] || {};

	function hashFile(file) {
		if (file.isNull()) return; // ignore
		if (file.isStream()) return this.emit('error', new PluginError(PLUGIN_NAME, 'Streaming not supported'));

		hashes[fileName][relativePath(file.cwd, file.path)] = hash(file);
	}

	function endStream() {
		var file, content;

		content = config.formatter(hashes[fileName]);

		if (typeof content !== 'string') {
			return this.emit('error', new PluginError(PLUGIN_NAME, 'Return value of `config.formatter` must be a string'));
		}

		file = new File({
			path: path.join(process.cwd(), fileName),
			contents: new Buffer(content)
		});

		this.emit('data', file);
		this.emit('end');
	}

	return es.through(hashFile, endStream);
};

module.exports.config = function(key, value) {
	if (!arguments.length) return config;

	if ({}.toString.call(key) === '[object Object]') {
		extend(config, key);
	} else if (typeof key === 'string') {
		if (arguments.length > 1) {
			config[key] = value;
		} else {
			return config[key];
		}
	} else {
		throw new PluginError(PLUGIN_NAME,  PLUGIN_NAME + ': Invalid first argument for .config(), must be object or string');
	}
};

module.exports.hashes = function() {
	return hashes;
};

// for testing. Don't use, may be removed or changed at anytime
module.exports._hash = hash;
module.exports._relativePath = relativePath;
module.exports._reset = function() {
	config = extend({}, defaultConfig);
	hashes = {};
};
