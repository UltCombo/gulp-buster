var bust = require('../');
var should = require('should');
//var os = require('os');
var path = require('path');
var File = require('gulp-util').File;
var Buffer = require('buffer').Buffer;
require('mocha');

describe('gulp-buster', function() {
	describe('buster()', function() {

		it('should hash a string', function() {
			var hash = bust._md5('foo');
			hash.should.be.a.String;
			hash.length.should.be.greaterThan(0);
		});

		it('should return a path relative to project root', function() {
			bust._path_relative_to_project('/projectRoot/', '/projectRoot/folder/file.ext')
				.should.equal('folder/file.ext');
		});

		it('should bust two files', function(done) {
			var fileContentStr = "foo",
				fileContentStr2 = "bar";

			var stream = bust("output.json");
			var fakeFile = new File({
				cwd: "/home/contra/",
				base: "/home/contra/test",
				path: "/home/contra/test/file.js",
				contents: new Buffer(fileContentStr)
			});

			var fakeFile2 = new File({
				cwd: "/home/contra/",
				base: "/home/contra/test",
				path: "/home/contra/test/file2.js",
				contents: new Buffer(fileContentStr2)
			});

			stream.on('data', function(newFile) {
				should.exist(newFile);
				should.exist(newFile.path);
				should.exist(newFile.relative);
				should.exist(newFile.contents);

				var newFilePath = path.resolve(newFile.path);
				var expectedFilePath = path.resolve("/home/contra/test/output.json");
				newFilePath.should.equal(expectedFilePath);

				newFile.relative.should.equal("output.json");
				var expectedObj = {};
				expectedObj[bust._path_relative_to_project(fakeFile.cwd, fakeFile.path)] = bust._md5(fileContentStr);
				expectedObj[bust._path_relative_to_project(fakeFile2.cwd, fakeFile2.path)] = bust._md5(fileContentStr2);

				JSON.parse(newFile.contents.toString()).should.eql(expectedObj);
				Buffer.isBuffer(newFile.contents).should.equal(true);
				done();
			});
			stream.write(fakeFile);
			stream.write(fakeFile2);
			stream.end();
		});

	});
});
