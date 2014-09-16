'use strict';

var bust = require('..'),
	assign = require('object-assign'),
	gutil = require('gulp-util'),
	fileContentStr = 'foo',
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
	}),
	fakeFileBustPath = bust._relativePath(fakeFile.cwd, fakeFile.path),
	fakeFileBustPath2 = bust._relativePath(fakeFile2.cwd, fakeFile2.path),
	fakeFileHash = bust._hash(fakeFile, bust._DEFAULT_OPTIONS),
	fakeFileHash2 = bust._hash(fakeFile2, bust._DEFAULT_OPTIONS);

require('should');

beforeEach(bust._reset);

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

		it('should set options whose value evaluate to `undefined` to their default value', function() {
			bust._assignOptions({ fileName: undefined }).should.eql(bust._DEFAULT_OPTIONS);
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
	it('should bust two files into the same output file in the same stream', function(done) {
		var stream = bust();
		stream.on('data', function(newFile) {
			newFile.should.be.an.instanceOf(gutil.File);
			newFile.should.have.property('path');
			newFile.should.have.property('relative');
			newFile.should.have.property('contents');

			newFile.relative.should.equal('busters.json');
			var expectedObj = {};
			expectedObj[fakeFileBustPath] = fakeFileHash;
			expectedObj[fakeFileBustPath2] = fakeFileHash2;

			JSON.parse(newFile.contents.toString()).should.eql(expectedObj);
			Buffer.isBuffer(newFile.contents).should.be.true;
			done();
		});
		stream.write(fakeFile);
		stream.end(fakeFile2);
	});

	it('should bust two files into different output files in different streams', function(done) {
		var stream = bust('output1.json'),
			stream2 = bust('output2.json'),
			testedOutputs = 0;

		stream.on('data', function(newFile) {
			var obj = JSON.parse(newFile.contents.toString());
			obj.should.have.property(fakeFileBustPath);
			obj.should.not.have.property(fakeFileBustPath2);
			if (++testedOutputs === 2) done();
		});
		stream2.on('data', function(newFile) {
			var obj = JSON.parse(newFile.contents.toString());
			obj.should.not.have.property(fakeFileBustPath);
			obj.should.have.property(fakeFileBustPath2);
			if (++testedOutputs === 2) done();
		});
		stream.end(fakeFile);
		stream2.end(fakeFile2);
	});

	it('should bust two files into the same output file in different streams', function(done) {
		var stream = bust('output.json'),
			stream2 = bust('output.json'),
			testedOutputs = 0;

		function runAssertion(newFile) {
			var obj = JSON.parse(newFile.contents.toString());
			obj.should.have.property(fakeFileBustPath);
			obj.should.have.property(fakeFileBustPath2);
			done();
		}
		function onData() {
			if (++testedOutputs === 2) runAssertion.apply(this, arguments);
		}
		stream.on('data', onData);
		stream2.on('data', onData);
		stream.end(fakeFile);
		stream2.end(fakeFile2);
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
			stream.end(fakeFile);
		});
	});

	describe('algo', function() {
		it('should accept a hashing algorithm name string', function(done) {
			var stream = bust({ algo: 'sha1' });
			stream.on('data', function(newFile) {
				JSON.parse(newFile.contents.toString())[fakeFileBustPath].should.be.a.String.with.lengthOf(40);
				done();
			});
			stream.end(fakeFile);
		});

		it('should emit an error when the hashing algorithm is not supported', function(done) {
			var stream = bust({ algo: 'UltHasher9000' });
			stream.on('error', function() {
				done();
			});
			stream.end(fakeFile);
		});

		it('should accept a synchronous function', function(done) {
			var stream = bust({
					algo: function(file) {
						(this === undefined).should.be.true;
						return file.contents.toString();
					},
				});
			stream.on('data', function(newFile) {
				JSON.parse(newFile.contents.toString())[fakeFileBustPath].should.equal(fileContentStr);
				done();
			});
			stream.end(fakeFile);
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
				JSON.parse(newFile.contents.toString())[fakeFileBustPath].should.equal(fileContentStr);
				done();
			});
			stream.end(fakeFile);
		});

		it('should emit an error when function does not return a string or promise', function(done) {
			var stream = bust({ algo: function() {} });
			stream.on('error', function(err) {
				err.should.be.an.instanceOf(gutil.PluginError);
				done();
			});
			stream.end(fakeFile);
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
			stream.end(fakeFile);
		});
	});

	describe('length', function() {
		it('should return leading characters for positive values', function(done) {
			var expectedLength = 6,
				stream = bust({ length: expectedLength });

			fakeFileHash.length.should.be.greaterThan(expectedLength);

			stream.on('data', function(newFile) {
				JSON.parse(newFile.contents.toString())[fakeFileBustPath].should.be.equal(fakeFileHash.slice(0, expectedLength));
				done();
			});
			stream.end(fakeFile);
		});

		it('should return trailing characters for negative values', function(done) {
			var expectedLength = 6,
				stream = bust({ length: -expectedLength });

			fakeFileHash.length.should.be.greaterThan(expectedLength);

			stream.on('data', function(newFile) {
				JSON.parse(newFile.contents.toString())[fakeFileBustPath].should.be.equal(fakeFileHash.slice(-expectedLength));
				done();
			});
			stream.end(fakeFile);
		});
	});

	describe('transform', function() {
		it('should accept a synchronous function', function(done) {
			var suffix = '_suffix',
				options = {
					transform: function(hashes) {
						(this === undefined).should.be.true;
						return [hashes[fakeFileBustPath] + suffix];
					},
				},
				stream = bust(options);
			stream.on('data', function(newFile) {
				JSON.parse(newFile.contents.toString())[0].should.equal(fakeFileHash + suffix);
				done();
			});
			stream.end(fakeFile);
		});

		it('should accept an asynchronous function', function(done) {
			var suffix = '_suffix',
				options = {
					transform: function(hashes) {
						(this === undefined).should.be.true;
						return new bust._Promise(function(fulfill) {
							setTimeout(function() {
								fulfill([hashes[fakeFileBustPath] + suffix]);
							}, 0);
						});
					},
				},
				stream = bust(options);
			stream.on('data', function(newFile) {
				JSON.parse(newFile.contents.toString())[0].should.equal(fakeFileHash + suffix);
				done();
			});
			stream.end(fakeFile);
		});
	});

	describe('formatter', function() {
		it('should accept a synchronous function', function(done) {
			var options = {
					formatter: function(hashes) {
						(this === undefined).should.be.true;
						return hashes[fakeFileBustPath];
					},
				},
				stream = bust(options);
			stream.on('data', function(newFile) {
				newFile.contents.toString().should.equal(fakeFileHash);
				done();
			});
			stream.end(fakeFile);
		});

		it('should accept an asynchronous function', function(done) {
			var options = {
					formatter: function(hashes) {
						(this === undefined).should.be.true;
						return new bust._Promise(function(fulfill) {
							setTimeout(function() {
								fulfill(hashes[fakeFileBustPath]);
							}, 0);
						});
					},
				},
				stream = bust(options);
			stream.on('data', function(newFile) {
				newFile.contents.toString().should.equal(fakeFileHash);
				done();
			});
			stream.end(fakeFile);
		});

		it('should emit an error when function does not return a string or promise', function(done) {
			var stream = bust({ formatter: function() {} });
			stream.on('error', function(err) {
				err.should.be.an.instanceOf(gutil.PluginError);
				done();
			});
			stream.end(fakeFile);
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
			stream.end(fakeFile);
		});
	});
});
