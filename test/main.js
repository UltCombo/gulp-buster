'use strict';

var bust = require('../'),
	should = require('should'),
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
			contents: new Buffer(fileContentStr),
		}),
		fakeFile2 = new File({
			cwd: '/home/contra/',
			base: '/home/contra/test',
			path: '/home/contra/test/file2.js',
			contents: new Buffer(fileContentStr2),
		});

	describe('Internal', function() {
		it('should hash a file', function() {
			bust._hash(fakeFile).should.be.a.String.and.have.property('length').greaterThan(0);
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
				expectedObj[bust._relativePath(fakeFile.cwd, fakeFile.path)] = bust._hash(fakeFile);
				expectedObj[bust._relativePath(fakeFile2.cwd, fakeFile2.path)] = bust._hash(fakeFile2);

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
				bust.config('fileName', 'customName.ext');

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
			it('should accept a hashing algorithm name string', function() {
				bust.config('algo', 'sha1');
				bust._hash(fakeFile).should.be.a.String.with.lengthOf(40);
			});

			it('should emit an error when the hashing algorithm is not supported', function(done) {
				bust.config('algo', 'UltHasher9000');
				bust._hash(fakeFile).should.be.an.Error;

				var stream = bust();
				stream.on('error', function() {
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});

			it('should accept a synchronous function', function() {
				bust.config('algo', function(file) {
					return file.contents.toString();
				});
				bust._hash(fakeFile).should.equal(fileContentStr);
			});

			it('should emit an error when function does not return a string', function(done) {
				bust.config('algo', function() {});
				bust._hash(fakeFile).should.be.an.Error;

				var stream = bust();
				stream.on('error', function() {
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});
		});

		describe('length', function() {
			it('should return leading characters for positive values; trailing for negative', function() {
				var expectedLength = 6;

				var fullHash = bust._hash(fakeFile);
				fullHash.length.should.be.greaterThan(expectedLength);

				bust.config('length', expectedLength);
				bust._hash(fakeFile).should.be.equal(fullHash.slice(0, expectedLength));

				bust.config('length', -expectedLength);
				bust._hash(fakeFile).should.be.equal(fullHash.slice(-expectedLength));
			});
		});

		describe('transform', function() {
			it('should accept a synchronous function', function(done) {
				var suffix = '_suffix';
				bust.config('transform', function(hashes) {
					return [hashes[Object.keys(hashes)[0]] + suffix];
				});

				var stream = bust();
				stream.on('data', function(newFile) {
					JSON.parse(newFile.contents.toString())[0].should.equal(bust._hash(fakeFile) + suffix);
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});
		});

		describe('formatter', function() {
			it('should accept a synchronous function', function(done) {
				bust.config('formatter', function(hashes) {
					return Object.keys(hashes).reduce(function(soFar, key) {
						return soFar + hashes[key];
					}, '');
				});

				var stream = bust();
				stream.on('data', function(newFile) {
					newFile.contents.toString().should.equal(bust._hash(fakeFile));
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});

			it('should emit an error when formatter does not return a string', function(done) {
				bust.config('formatter', function() {});
				var stream = bust();
				stream.on('error', function() {
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});
		});
	});
});
