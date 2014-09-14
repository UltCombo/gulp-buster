'use strict';

var PLUGIN_NAME = 'gulp-buster',
	crypto = require('crypto'),
	path = require('path'),
	through = require('through'),
	assign = require('object-assign'),
	gutil = require('gulp-util');

function error(msg) {
	return new gutil.PluginError(PLUGIN_NAME, msg);
}

function hash(file, options) {
	var ret;
	if (typeof options.algo === 'function') {
		ret = options.algo.call(undefined, file);
		if (typeof ret !== 'string') return error('Return value of `options.algo` must be a string');
	} else try {
		ret = crypto.createHash(options.algo).update(file.contents.toString()).digest('hex');
	} catch(e) {
		return error(e.message);
	}

	// positive length = leading characters; negative = trailing
	return options.length
		? options.length > 0
			? ret.slice(0, options.length)
			: ret.slice(options.length)
		: ret;
}

function relativePath(projectPath, filePath) {
	return path.relative(projectPath, filePath).replace(/\\/g, '/');
}

function assignOptions(options) {
	if (typeof options === 'string') options = { fileName: options };
	return assign({
		fileName: 'busters.json',
		algo: 'md5',
		length: 0,
		transform: Object,
		formatter: JSON.stringify,
	}, options);
}

module.exports = exports = function(options) {
	options = assignOptions(options);
	var hashes = {};

	function hashFile(file) {
		if (file.isNull()) return; // ignore
		if (file.isStream()) return this.emit('error', error('Streaming not supported'));

		var result = hash(file, options);
		if (result instanceof gutil.PluginError) return this.emit('error', result);
		hashes[relativePath(file.cwd, file.path)] = result;
	}

	function endStream() {
		var file, content;

		content = options.formatter.call(undefined, options.transform.call(undefined, assign({}, hashes)));

		if (typeof content !== 'string') {
			return this.emit('error', error('Return value of `options.formatter` must be a string'));
		}

		file = new gutil.File({
			path: path.join(process.cwd(), options.fileName),
			contents: new Buffer(content)
		});

		this.emit('data', file);
		this.emit('end');
	}

	return through(hashFile, endStream);
};

// for testing. Don't use, may be removed or changed at anytime
exports._hash = hash;
exports._relativePath = relativePath;
exports._assignOptions = assignOptions;
