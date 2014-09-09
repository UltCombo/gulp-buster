'use strict';

var PLUGIN_NAME = 'gulp-buster',
	crypto = require('crypto'),
	path = require('path'),
	es = require('event-stream'),
	gutil = require('gulp-util'),
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

function error(msg) {
	return new gutil.PluginError(PLUGIN_NAME, msg);
}

function hash(file) {
	var ret;
	if (typeof config.algo === 'function') {
		ret = config.algo.call(null, file);
		if (typeof ret !== 'string') return error('Return value of `config.algo` must be a string');
	} else try {
		ret = crypto.createHash(config.algo).update(file.contents.toString()).digest('hex');
	} catch(e) {
		return error(e.message);
	}

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
		if (file.isStream()) return this.emit('error', error('Streaming not supported'));

		var result = hash(file);
		if (result instanceof gutil.PluginError) return this.emit('error', result);
		hashes[fileName][relativePath(file.cwd, file.path)] = result;
	}

	function endStream() {
		var file, content;

		content = config.formatter.call(null, hashes[fileName]);

		if (typeof content !== 'string') {
			return this.emit('error', error('Return value of `config.formatter` must be a string'));
		}

		file = new gutil.File({
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
		throw error('Invalid first argument for .config(), must be object or string');
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
