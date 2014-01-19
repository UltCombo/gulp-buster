var crypto = require('crypto'),
	path = require('path'),
	es = require('event-stream'),
	gutil = require('gulp-util'),
	File = gutil.File,
	PluginError = gutil.PluginError,
	hashes = {};

const PLUGIN_NAME = 'gulp-buster';

function md5(str) {
	return crypto.createHash('md5').update(str).digest('hex');
}
function path_relative_to_project(projectPath, filePath) {
	return path.relative(projectPath, filePath).replace(/\\/g, '/');
}

module.exports = function(fileName) {
	if (!fileName) throw new PluginError(PLUGIN_NAME,  'Missing fileName option for ' + PLUGIN_NAME);

	var firstFile;

	function bufferContents(file) {
		if (file.isNull()) return; // ignore
		if (file.isStream()) return this.emit('error', new PluginError(PLUGIN_NAME,  'Streaming not supported'));

		if (!firstFile) firstFile = file;

		hashes[path_relative_to_project(file.cwd, file.path)] = md5(file.contents.toString('utf8'));
	}

	function endStream() {
		var file = new File({
			cwd: firstFile.cwd,
			base: firstFile.base,
			path: path.join(firstFile.base, fileName),
			contents: new Buffer(JSON.stringify(hashes))
		});

		this.emit('data', file);
		this.emit('end');
	}

	return es.through(bufferContents, endStream);
};

// for testing
module.exports._md5 = md5;
module.exports._path_relative_to_project = path_relative_to_project;
