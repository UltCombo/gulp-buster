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

		it('should return an empty hashes object file when receiving an empty buffers stream', function() {
			var stream = bust("empty.json");
			stream.on('data', function(newFile) {
				JSON.parse(newFile.contents.toString()).should.eql({});
			});
			stream.end();
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
		it('should accept custom formatter', function() {
			var fileContentStr = 'foo';

			bust.config({
				formatter: function(hashes) {
					return Object.keys(hashes).reduce(function(soFar, key) {
						return soFar + hashes[key];
					}, '');
				}
			});

			var stream = bust("output1.json");
			var fakeFile = new File({
				cwd: "/home/contra/",
				base: "/home/contra/test",
				path: "/home/contra/test/file.js",
				contents: new Buffer(fileContentStr)
			});

			stream.on('data', function(newFile) {
				newFile.contents.toString().should.equal(bust._hash(fileContentStr));
			});

			stream.write(fakeFile);
			stream.end();
		});
	});

	describe('directory mode', function() {
		var file1Directory1 = new File({
			cwd: ".",
			base: "fixture/dir1",
			path: "fixture/dir1/file1.js",
			contents: new Buffer("// File 1, Directory 1")
		}),
		file2Directory1 = new File({
			cwd: ".",
			base: "fixture/dir1",
			path: "fixture/dir1/file2.js",
			contents: new Buffer("// File 2, Directory 1")
		}),
		file1Directory2 = new File({
			cwd: ".",
			base: "fixture/dir2",
			path: "fixture/dir2/file1.js",
			contents: new Buffer("// File 1, Directory 2")
		});

		it('should generate different output than file mode', function() {
			var stream, fileModeOutput, dirModeOutput;

			function streamEnded() {
				if (dirModeOutput && fileModeOutput) {
					dirModeOutput.should.not.equal(fileModeOutput);
				}
			}

			bust.config({fileName: 'test.json'});
			stream = bust();
			stream.on('end', function(){
				fileModeOutput = bust.hashes();
				streamEnded();
			});
			stream.write(file1Directory1);
			stream.end();

			bust._reset();
			bust.config({fileName: 'test.json', mode: 'dir'});
			stream = bust();
			stream.on('end', function(){
				dirModeOutput = bust.hashes();
				streamEnded();
			});
			stream.write(file1Directory1);
			stream.end();

		});

		it("should generate hashes whose keys are base directories", function() {
			var stream, baseDirectory, directoryHashes;
			bust.config({fileName: 'test.json', mode: 'dir'});
			stream = bust();
			stream.on('end', function() {
				directoryHashes = bust.hashes()['test.json'];
				for (baseDirectory in directoryHashes) {
					[file1Directory1.base, file1Directory2.base, file2Directory1.base].should.containEql(baseDirectory);
				}
			});
			stream.write(file1Directory1);
			stream.write(file2Directory1);
			stream.write(file1Directory2);
			stream.end();
		});

		it('should generate different hashes when the contents of a base directory are different', function() {
			var outputs = [], stream;
			bust.config({fileName: 'test.json', mode: 'dir'});
			stream = bust();
			stream.on('end', function() {
				outputs.push(bust.hashes()['test.json']);
			});
			stream.write(file1Directory1);
			stream.end();

			bust._reset();
			bust.config({fileName: 'test.json', mode: 'dir'});
			stream = bust();
			stream.on('end', function() {
				outputs.push(bust.hashes()['test.json']);
				outputs[0]['fixture/dir1'].should.not.equal(outputs[1]['fixture/dir1']);
			});
			stream.write(file2Directory1);
			stream.end();
		});

		it('should generate the same hashes when the contents of a base directory are the same', function() {
			var outputs = [], stream;
			bust.config({fileName: 'test.json', mode: 'dir'});
			stream = bust();
			stream.on('end', function() {
				outputs.push(bust.hashes()['test.json']);
			});
			stream.write(file1Directory1);
			stream.write(file2Directory1);
			stream.end();

			bust._reset();
			bust.config({fileName: 'test.json', mode: 'dir'});
			stream = bust();
			stream.on('end', function() {
				outputs.push(bust.hashes()['test.json']);
				outputs[0]['fixture/dir1'].should.equal(outputs[1]['fixture/dir1']);
			});
			stream.write(file1Directory1);
			stream.write(file2Directory1);
			stream.end();
		});
	});
});
