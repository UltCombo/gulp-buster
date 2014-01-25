var bust = require('../');
var should = require('should');
//var os = require('os');
var path = require('path');
var File = require('gulp-util').File;
var Buffer = require('buffer').Buffer;
require('mocha');

beforeEach(function() {
	bust._reset();
});

describe('gulp-buster', function() {
	describe('buster()', function() {

		it('should hash a string', function() {
			var hash = bust._hash('foo');
			hash.should.be.a.String;
			hash.length.should.be.greaterThan(0);
		});

		it('should return a hash with fixed length', function() {
			var expectedLength = 6;
			bust.config('length', expectedLength);

			var hash = bust._hash('foo');
			hash.should.be.a.String;
			hash.length.should.equal(expectedLength);
		});

		it('should return a path relative to project root', function() {
			bust._path_relative_to_project('/projectRoot/', '/projectRoot/folder/file.ext')
				.should.equal('folder/file.ext');
		});

		it('should bust two files into the same output', function(done) {
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
				expectedObj[bust._path_relative_to_project(fakeFile.cwd, fakeFile.path)] = bust._hash(fileContentStr);
				expectedObj[bust._path_relative_to_project(fakeFile2.cwd, fakeFile2.path)] = bust._hash(fileContentStr2);

				JSON.parse(newFile.contents.toString()).should.eql(expectedObj);
				Buffer.isBuffer(newFile.contents).should.equal(true);
				done();
			});
			stream.write(fakeFile);
			stream.write(fakeFile2);
			stream.end();
		});

		it('should bust two files into different outputs', function(done) {
			var fileContentStr = "foo",
				fileContentStr2 = "bar";

			var stream = bust("output1.json");
			var fakeFile = new File({
				cwd: "/home/contra/",
				base: "/home/contra/test",
				path: "/home/contra/test/file.js",
				contents: new Buffer(fileContentStr)
			});

			var stream2 = bust("output2.json");
			var fakeFile2 = new File({
				cwd: "/home/contra/",
				base: "/home/contra/test",
				path: "/home/contra/test/file2.js",
				contents: new Buffer(fileContentStr2)
			});

			var testedOutputs = 0;
			stream.on('data', function(newFile) {
				var obj = JSON.parse(newFile.contents.toString());
				should.exist(obj[bust._path_relative_to_project(fakeFile.cwd, fakeFile.path)]);
				should.not.exist(obj[bust._path_relative_to_project(fakeFile2.cwd, fakeFile2.path)]);
				if (++testedOutputs === 2) done();
			});
			stream2.on('data', function(newFile) {
				var obj = JSON.parse(newFile.contents.toString());
				should.not.exist(obj[bust._path_relative_to_project(fakeFile.cwd, fakeFile.path)]);
				should.exist(obj[bust._path_relative_to_project(fakeFile2.cwd, fakeFile2.path)]);
				if (++testedOutputs === 2) done();
			});
			stream.write(fakeFile);
			stream.end();
			stream2.write(fakeFile2);
			stream2.end();
		});

		it('should export hashes', function() {
			var fileContentStr = "foo";

			var stream = bust("output1.json");
			var fakeFile = new File({
				cwd: "/home/contra/",
				base: "/home/contra/test",
				path: "/home/contra/test/file.js",
				contents: new Buffer(fileContentStr)
			});

			stream.on('data', function(newFile) {
				var obj = JSON.parse(newFile.contents.toString());
				should.exist(obj[bust._path_relative_to_project(fakeFile.cwd, fakeFile.path)]);
			});
			stream.write(fakeFile);
			stream.end();

			var hashes = bust.hashes();
			hashes.should.have.property('output1.json');
			hashes['output1.json'].should.have.property('test/file.js');
		});


	});

	describe('config method', function() {
		it('should return the configs object', function() {
			bust.config().should.be.an.Object;
		});
		it('should accept an object as setter; string as getter', function() {
			bust.config({ foo: 0, bar: 1 });
			bust.config('foo').should.equal(0);
			bust.config('bar').should.equal(1);
		});
		it('should accept two arguments as setter', function() {
			bust.config('foo', 'bar');
			bust.config('foo').should.equal('bar');
		});
	});
});
