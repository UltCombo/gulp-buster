'use strict';

var bust = require('../'),
	should = require('should'),
	path = require('path'),
	File = require('gulp-util').File,
	Buffer = require('buffer').Buffer;

beforeEach(bust._reset);

describe('gulp-buster', function() {
	var fileContentStr = 'foo',
		fileContentStr2 = 'bar',
		fakeFile = new File({
			cwd: '/home/contra/',
			base: '/home/contra/test',
			path: '/home/contra/test/file.js',
			contents: new Buffer(fileContentStr)
		}),
		fakeFile2 = new File({
			cwd: '/home/contra/',
			base: '/home/contra/test',
			path: '/home/contra/test/file2.js',
			contents: new Buffer(fileContentStr2)
		});

	describe('Internal', function() {
		it('should hash a string', function() {
			var hash = bust._hash('foo');
			hash.should.be.a.String;
			hash.length.should.be.greaterThan(0);
		});

		it('should return a path relative to project root', function() {
			bust._relativePath('/projectRoot/', '/projectRoot/folder/file.ext').should.equal('folder/file.ext');
		});
	});

	describe('Core', function() {
		it('should bust two files into the same output', function(done) {
			var stream = bust('output.json');
			stream.on('data', function(newFile) {
				should.exist(newFile);
				should.exist(newFile.path);
				should.exist(newFile.relative);
				should.exist(newFile.contents);

				newFile.relative.should.equal('output.json');
				var expectedObj = {};
				expectedObj[bust._relativePath(fakeFile.cwd, fakeFile.path)] = bust._hash(fileContentStr);
				expectedObj[bust._relativePath(fakeFile2.cwd, fakeFile2.path)] = bust._hash(fileContentStr2);

				JSON.parse(newFile.contents.toString()).should.eql(expectedObj);
				Buffer.isBuffer(newFile.contents).should.equal(true);
				done();
			});
			stream.write(fakeFile);
			stream.write(fakeFile2);
			stream.end();
		});

		it('should bust two files into different outputs', function(done) {
			var stream = bust('output1.json'),
				stream2 = bust('output2.json');

			var testedOutputs = 0;
			stream.on('data', function(newFile) {
				var obj = JSON.parse(newFile.contents.toString());
				should.exist(obj[bust._relativePath(fakeFile.cwd, fakeFile.path)]);
				should.not.exist(obj[bust._relativePath(fakeFile2.cwd, fakeFile2.path)]);
				if (++testedOutputs === 2) done();
			});
			stream2.on('data', function(newFile) {
				var obj = JSON.parse(newFile.contents.toString());
				should.not.exist(obj[bust._relativePath(fakeFile.cwd, fakeFile.path)]);
				should.exist(obj[bust._relativePath(fakeFile2.cwd, fakeFile2.path)]);
				if (++testedOutputs === 2) done();
			});
			stream.write(fakeFile);
			stream.end();
			stream2.write(fakeFile2);
			stream2.end();
		});

		it('should return an empty hashes object file when receiving an empty buffers stream', function(done) {
			var stream = bust('empty.json');
			stream.on('data', function(newFile) {
				JSON.parse(newFile.contents.toString()).should.eql({});
				done();
			});
			stream.end();
		});
	});

	describe('.hashes()', function() {
		it('should return all cached hashes', function(done) {
			var stream = bust('output1.json');
			stream.on('end', function() {
				var hashes = bust.hashes();
				hashes.should.have.property('output1.json');
				hashes['output1.json'].should.have.property('test/file.js');
				done();
			});
			stream.write(fakeFile);
			stream.end();
		});
	});

	describe('.config()', function() {
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

	describe('config options', function() {
		describe('fileName', function() {
			it('should allow setting the default file name', function(done) {
				bust.config({
					fileName: 'customName.ext',
				});

				var stream = bust();
				stream.on('data', function(newFile) {
					newFile.relative.should.equal('customName.ext');
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});
		});

		describe('algo', function() {
			it('should allow setting the hashing algorithm', function() {
				bust.config('algo', 'sha1');
				bust._hash('foo').length.should.equal(40);
			});
		});

		describe('length', function() {
			it('should return a hash with fixed length', function() {
				var expectedLength = 6;
				bust.config('length', expectedLength);

				var hash = bust._hash('foo');
				hash.should.be.a.String;
				hash.length.should.equal(expectedLength);
			});
		});

		describe('formatter', function() {
			it('should accept a custom formatter', function(done) {
				bust.config({
					formatter: function(hashes) {
						return Object.keys(hashes).reduce(function(soFar, key) {
							return soFar + hashes[key];
						}, '');
					}
				});

				var stream = bust('output1.json');
				stream.on('data', function(newFile) {
					newFile.contents.toString().should.equal(bust._hash(fileContentStr));
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});

			it('should emit an error when formatter does not return a string', function(done) {
				bust.config({
					formatter: function() {}
				});
				var stream = bust('output1.json');
				stream.on('error', function() {
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});
		});
	});

	// TODO remove this suite when the `transform` config option is implemented
	describe('directory mode', function() {
		var file1Directory1 = new File({
			cwd: '.',
			base: 'fixture/dir1',
			path: 'fixture/dir1/file1.js',
			contents: new Buffer('// File 1, Directory 1')
		}),
		file2Directory1 = new File({
			cwd: '.',
			base: 'fixture/dir1',
			path: 'fixture/dir1/file2.js',
			contents: new Buffer('// File 2, Directory 1')
		}),
		file1Directory2 = new File({
			cwd: '.',
			base: 'fixture/dir2',
			path: 'fixture/dir2/file1.js',
			contents: new Buffer('// File 1, Directory 2')
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

		it('should generate hashes whose keys are base directories', function() {
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
