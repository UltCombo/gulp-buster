'use strict';

var bust = require('../'),
	should = require('should'),
	File = require('gulp-util').File;

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
			bust._hash(fakeFile, bust._assignOptions()).should.be.a.String.and.have.property('length').greaterThan(0);
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
				expectedObj[bust._relativePath(fakeFile.cwd, fakeFile.path)] = bust._hash(fakeFile, bust._assignOptions());
				expectedObj[bust._relativePath(fakeFile2.cwd, fakeFile2.path)] = bust._hash(fakeFile2, bust._assignOptions());

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

	describe('config options', function() {
		describe('fileName', function() {
			it('should allow setting the default file name', function(done) {
				var fileName = 'customName.ext';

				var stream = bust({ fileName: fileName });
				stream.on('data', function(newFile) {
					newFile.relative.should.equal(fileName);
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});
		});

		describe('algo', function() {
			it('should accept a hashing algorithm name string', function() {
				bust._hash(fakeFile, bust._assignOptions({ algo: 'sha1' })).should.be.a.String.with.lengthOf(40);
			});

			it('should emit an error when the hashing algorithm is not supported', function(done) {
				var options = { algo: 'UltHasher9000' };
				bust._hash(fakeFile, bust._assignOptions(options)).should.be.an.Error;

				var stream = bust(options);
				stream.on('error', function() {
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});

			it('should accept a synchronous function', function() {
				bust._hash(fakeFile, bust._assignOptions({
					algo: function(file) {
						(this === undefined).should.be.true;
						return file.contents.toString();
					},
				})).should.equal(fileContentStr);
			});

			it('should emit an error when function does not return a string', function(done) {
				var options = {
					algo: function() {},
				};
				bust._hash(fakeFile, bust._assignOptions(options)).should.be.an.Error;

				var stream = bust(options);
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

				var fullHash = bust._hash(fakeFile, bust._assignOptions());
				fullHash.length.should.be.greaterThan(expectedLength);

				bust._hash(fakeFile, bust._assignOptions({ length: expectedLength })).should.be.equal(fullHash.slice(0, expectedLength));
				bust._hash(fakeFile, bust._assignOptions({ length: -expectedLength })).should.be.equal(fullHash.slice(-expectedLength));
			});
		});

		describe('transform', function() {
			it('should accept a synchronous function', function(done) {
				var suffix = '_suffix',
					options = {
						transform: function(hashes) {
							(this === undefined).should.be.true;
							return [hashes[Object.keys(hashes)[0]] + suffix];
						},
					},
					stream = bust(options);
				stream.on('data', function(newFile) {
					JSON.parse(newFile.contents.toString())[0].should.equal(bust._hash(fakeFile, bust._assignOptions(options)) + suffix);
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});
		});

		describe('formatter', function() {
			it('should accept a synchronous function', function(done) {
				var options = {
					formatter: function(hashes) {
							(this === undefined).should.be.true;
							return Object.keys(hashes).reduce(function(soFar, key) {
								return soFar + hashes[key];
							}, '');
						},
					},
					stream = bust(options);
				stream.on('data', function(newFile) {
					newFile.contents.toString().should.equal(bust._hash(fakeFile, bust._assignOptions(options)));
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});

			it('should emit an error when formatter does not return a string', function(done) {
				var stream = bust({
					formatter: function() {},
				});
				stream.on('error', function() {
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});
		});
	});
});
