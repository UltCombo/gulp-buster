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
		mode: 'file'
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

function hash(str) {
	var ret = crypto.createHash(config.algo).update(str).digest('hex');
	return config.length ? ret.substr(0, config.length) : ret;
}

function path_relative_to_project(projectPath, filePath) {
	return path.relative(projectPath, filePath).replace(/\\/g, '/');
}

module.exports = function(fileName) {
	fileName = fileName || config.fileName;
	hashes[fileName] = hashes[fileName] || {};

	var isDirectoryMode = config.mode === 'dir',
		combinedFileContents = {};

	function bufferContents(file) {
		if (file.isNull()) return; // ignore
		if (file.isStream()) return this.emit('error', new PluginError(PLUGIN_NAME, 'Streaming not supported'));

		if(isDirectoryMode) {
			combinedFileContents[path_relative_to_project(file.cwd, file.base)] = (combinedFileContents[path_relative_to_project(file.cwd, file.base)] || '') + file.contents;
		} else {
			hashes[fileName][path_relative_to_project(file.cwd, file.path)] = hash(file.contents.toString('utf8'));
		}
	}

	function endStream() {
		var key, file;
		if (isDirectoryMode) {
			for (key in combinedFileContents) {
				hashes[fileName][key] = hash(combinedFileContents[key]);
			}
		}

		file = new File({
			path: path.join(process.cwd(), fileName),
			contents: new Buffer(JSON.stringify(hashes[fileName]))
		});

		this.emit('data', file);
		this.emit('end');
	}

	return es.through(bufferContents, endStream);
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
module.exports._path_relative_to_project = path_relative_to_project;
module.exports._reset = function() {
	config = extend({}, defaultConfig);
	hashes = {};
};
