'use strict';

var crypto = require('crypto'),
	path = require('path'),
	through = require('through'),
	assign = require('object-assign'),
	gutil = require('gulp-util'),
	DEFAULT_OPTIONS = {
		fileName: 'busters.json',
		algo: 'md5',
		length: 0,
		transform: Object,
		formatter: JSON.stringify,
	},
	OPTION_TYPES = {
		fileName: ['String'],
		algo: ['String', 'Function'],
		length: ['Number'],
		transform: ['Function'],
		formatter: ['Function'],
	};

function error(msg) {
	return new gutil.PluginError('gulp-buster', msg);
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

function getType(value) {
	return {}.toString.call(value).slice(8, -1);
}

function assignOptions(options) {
	if (typeof options === 'string') options = { fileName: options };
	options = options || {};

	Object.keys(options).forEach(function(option) {
		if (!OPTION_TYPES.hasOwnProperty(option)) throw error('Unsupported option: ' + option);
		if (!~OPTION_TYPES[option].indexOf(getType(options[option]))) throw error('`options.' + option + '` must be of type ' + OPTION_TYPES[option].join(' or '));
	});

	return assign({}, DEFAULT_OPTIONS, options);
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
		var content = options.formatter.call(undefined, options.transform.call(undefined, assign({}, hashes)));
		if (typeof content !== 'string') return this.emit('error', error('Return value of `options.formatter` must be a string'));

		this.emit('data', new gutil.File({
			path: path.join(process.cwd(), options.fileName),
			contents: new Buffer(content),
		}));
		this.emit('end');
	}

	return through(hashFile, endStream);
};

// for testing. Don't use, may be removed or changed at anytime
assign(exports, {
	_DEFAULT_OPTIONS: DEFAULT_OPTIONS,
	_hash: hash,
	_relativePath: relativePath,
	_getType: getType,
	_assignOptions: assignOptions,
});
