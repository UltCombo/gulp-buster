'use strict';

var bust = require('..'),
	should = require('should'),
	assign = require('object-assign'),
	gutil = require('gulp-util');

describe('gulp-buster', function() {
	var fileContentStr = 'foo',
		fileContentStr2 = 'bar',
		fakeFile = new gutil.File({
			cwd: '/home/contra/',
			base: '/home/contra/test',
			path: '/home/contra/test/file.js',
			contents: new Buffer(fileContentStr),
		}),
		fakeFile2 = new gutil.File({
			cwd: '/home/contra/',
			base: '/home/contra/test',
			path: '/home/contra/test/file2.js',
			contents: new Buffer(fileContentStr2),
		});

	describe('Internal methods independent of configuration options', function() {
		describe('_error()', function() {
			it('should return an instance of PluginError', function() {
				bust._error('err').should.be.an.instanceOf(gutil.PluginError);
			});
		});

		describe('_relativePath()', function() {
			it('should return a path relative to project root', function() {
				bust._relativePath('/projectRoot/', '/projectRoot/folder/file.ext').should.equal('folder/file.ext');
			});
		});

		describe('_getType()', function() {
			it('should return the correct type for all native values', function() {
				bust._getType('').should.equal('String');
				bust._getType(0).should.equal('Number');
				bust._getType({}).should.equal('Object');
				bust._getType([]).should.equal('Array');
				bust._getType(null).should.equal('Null');
				bust._getType(undefined).should.equal('Undefined');
				bust._getType(false).should.equal('Boolean');
				bust._getType(function() {}).should.equal('Function');
				bust._getType(/(?:)/).should.equal('RegExp');
				bust._getType(new Date()).should.equal('Date');
				bust._getType(new Error()).should.equal('Error');
			});
		});

		describe('_assignOptions()', function() {
			it('should assign options', function() {
				var options = { length: 10, algo: 'md5' };
				bust._assignOptions(options).should.eql(assign({}, bust._DEFAULT_OPTIONS, options));
			});

			it('should return the default options when no options are passed', function() {
				bust._assignOptions().should.eql(bust._DEFAULT_OPTIONS);
			});

			it('should treat `options` string as `options.fileName`', function() {
				var fileName = 'customName.ext';
				bust._assignOptions(fileName).fileName.should.equal(fileName);
			});

			it('should throw on unsupported options', function() {
				bust._assignOptions.bind(undefined, { foo: 0 }).should.throw();
			});

			it('should throw on invalid option value', function() {
				bust._assignOptions.bind(undefined, { transform: null }).should.throw();
			});
		});
	});

	describe('Core', function() {
		it('should bust two files into the same output', function(done) {
			var stream = bust();
			stream.on('data', function(newFile) {
				should.exist(newFile);
				should.exist(newFile.path);
				should.exist(newFile.relative);
				should.exist(newFile.contents);

				newFile.relative.should.equal('busters.json');
				var expectedObj = {};
				expectedObj[bust._relativePath(fakeFile.cwd, fakeFile.path)] = bust._hash(fakeFile, bust._assignOptions());
				expectedObj[bust._relativePath(fakeFile2.cwd, fakeFile2.path)] = bust._hash(fakeFile2, bust._assignOptions());

				JSON.parse(newFile.contents.toString()).should.eql(expectedObj);
				Buffer.isBuffer(newFile.contents).should.be.true;
				done();
			});
			stream.write(fakeFile);
			stream.write(fakeFile2);
			stream.end();
		});

		it('should bust two files into different outputs', function(done) {
			var stream = bust(),
				stream2 = bust(),
				testedOutputs = 0;

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
			var stream = bust();
			stream.on('data', function(newFile) {
				JSON.parse(newFile.contents.toString()).should.eql({});
				done();
			});
			stream.end();
		});
	});

	describe('Configuration options', function() {
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
			it('should accept a hashing algorithm name string', function(done) {
				var stream = bust({ algo: 'sha1' });
				stream.on('data', function(newFile) {
					var obj = JSON.parse(newFile.contents.toString());
					obj[Object.keys(obj)[0]].should.be.a.String.with.lengthOf(40);
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});

			it('should emit an error when the hashing algorithm is not supported', function(done) {
				var stream = bust({ algo: 'UltHasher9000' });
				stream.on('error', function() {
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});

			it('should accept a synchronous function', function(done) {
				var stream = bust({
						algo: function(file) {
							(this === undefined).should.be.true;
							return file.contents.toString();
						},
					});
				stream.on('data', function(newFile) {
					var obj = JSON.parse(newFile.contents.toString());
					obj[Object.keys(obj)[0]].should.equal(fileContentStr);
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});

			it('should accept an asynchronous function', function(done) {
				var stream = bust({
						algo: function(file) {
							(this === undefined).should.be.true;
							return new bust._Promise(function(fulfill) {
								setTimeout(function() {
									fulfill(file.contents.toString());
								}, 0);
							});
						},
					});
				stream.on('data', function(newFile) {
					var obj = JSON.parse(newFile.contents.toString());
					obj[Object.keys(obj)[0]].should.equal(fileContentStr);
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});

			it('should emit an error when function does not return a string or promise', function(done) {
				var stream = bust({ algo: function() {} });
				stream.on('error', function(err) {
					err.should.be.an.instanceOf(gutil.PluginError);
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});

			it('should emit an error when promise is not fulfilled with a string', function(done) {
				var stream = bust({
						algo: function() {
							return new bust._Promise.resolve();
						},
					});
				stream.on('error', function(err) {
					err.should.be.an.instanceOf(gutil.PluginError);
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});
		});

		describe('length', function() {
			it('should return leading characters for positive values', function(done) {
				var expectedLength = 6,
					fullHash = bust._hash(fakeFile, bust._assignOptions()),
					stream = bust({ length: expectedLength });

				fullHash.length.should.be.greaterThan(expectedLength);

				stream.on('data', function(newFile) {
					var obj = JSON.parse(newFile.contents.toString());
					obj[Object.keys(obj)[0]].should.be.equal(fullHash.slice(0, expectedLength));
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});

			it('should return trailing characters for negative values', function(done) {
				var expectedLength = 6,
					fullHash = bust._hash(fakeFile, bust._assignOptions()),
					stream = bust({ length: -expectedLength });

				fullHash.length.should.be.greaterThan(expectedLength);

				stream.on('data', function(newFile) {
					var obj = JSON.parse(newFile.contents.toString());
					obj[Object.keys(obj)[0]].should.be.equal(fullHash.slice(-expectedLength));
					done();
				});
				stream.write(fakeFile);
				stream.end();
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

			it('should accept an asynchronous function', function(done) {
				var suffix = '_suffix',
					options = {
						transform: function(hashes) {
							(this === undefined).should.be.true;
							return new bust._Promise(function(fulfill) {
								setTimeout(function() {
									fulfill([hashes[Object.keys(hashes)[0]] + suffix]);
								}, 0);
							});
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
							return hashes[Object.keys(hashes)[0]];
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

			it('should accept an asynchronous function', function(done) {
				var options = {
						formatter: function(hashes) {
							(this === undefined).should.be.true;
							return new bust._Promise(function(fulfill) {
								setTimeout(function() {
									fulfill(hashes[Object.keys(hashes)[0]]);
								}, 0);
							});
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

			it('should emit an error when function does not return a string or promise', function(done) {
				var stream = bust({ formatter: function() {} });
				stream.on('error', function(err) {
					err.should.be.an.instanceOf(gutil.PluginError);
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});

			it('should emit an error when promise is not fulfilled with a string', function(done) {
				var stream = bust({
						formatter: function() {
							return new bust._Promise.resolve();
						},
					});
				stream.on('error', function(err) {
					err.should.be.an.instanceOf(gutil.PluginError);
					done();
				});
				stream.write(fakeFile);
				stream.end();
			});
		});
	});
});
