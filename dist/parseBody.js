'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

exports.parseBody = parseBody;

var _contentType = require('content-type');

var _contentType2 = _interopRequireDefault(_contentType);

var _rawBody = require('raw-body');

var _rawBody2 = _interopRequireDefault(_rawBody);

var _httpErrors = require('http-errors');

var _httpErrors2 = _interopRequireDefault(_httpErrors);

var _querystring = require('querystring');

var _querystring2 = _interopRequireDefault(_querystring);

var _zlib = require('zlib');

var _zlib2 = _interopRequireDefault(_zlib);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function parseBody(req, request) {
  return new Promise(function (resolve, reject) {
    // If koa has already parsed a body as a keyed object, use it.
    if ((0, _typeof3.default)(req.body) === 'object' && !(req.body instanceof Buffer)) {
      return resolve(req.body || {});
    }

    if ((0, _typeof3.default)(request.body) === 'object' && !(request.body instanceof Buffer)) {
      return resolve(request.body);
    }

    // Skip requests without content types.
    if (req.headers['content-type'] === undefined) {
      return resolve({});
    }

    var typeInfo = _contentType2.default.parse(req);

    // If koa has already parsed a body as a string, and the content-type
    // was application/graphql, parse the string body.
    if (typeof request.body === 'string' && typeInfo.type === 'application/graphql') {
      return resolve(graphqlParser(request.body));
    }

    // Already parsed body we didn't recognise? Parse nothing.
    if (request.body) {
      return resolve({});
    }

    // Use the correct body parser based on Content-Type header.
    switch (typeInfo.type) {
      case 'application/graphql':
        return read(req, typeInfo, graphqlParser, resolve, reject);
      case 'application/json':
        return read(req, typeInfo, jsonEncodedParser, resolve, reject);
      case 'application/x-www-form-urlencoded':
        return read(req, typeInfo, urlEncodedParser, resolve, reject);
    }

    // If no Content-Type header matches, parse nothing.
    return resolve({});
  });
}

function jsonEncodedParser(body) {
  if (jsonObjRegex.test(body)) {
    /* eslint-disable no-empty */
    try {
      return JSON.parse(body);
    } catch (error) {}
    // Do nothing

    /* eslint-enable no-empty */
  }
  throw (0, _httpErrors2.default)(400, 'POST body sent invalid JSON.');
}

function urlEncodedParser(body) {
  return _querystring2.default.parse(body);
}

function graphqlParser(body) {
  return { query: body };
}

/**
 * RegExp to match an Object-opening brace "{" as the first non-space
 * in a string. Allowed whitespace is defined in RFC 7159:
 *
 *     x20  Space
 *     x09  Horizontal tab
 *     x0A  Line feed or New line
 *     x0D  Carriage return
 */
var jsonObjRegex = /^[\x20\x09\x0a\x0d]*\{/;

// Read and parse a request body.
function read(req, typeInfo, parseFn, resolve, reject) {
  var charset = (typeInfo.parameters.charset || 'utf-8').toLowerCase();

  // Assert charset encoding per JSON RFC 7159 sec 8.1
  if (charset.slice(0, 4) !== 'utf-') {
    throw (0, _httpErrors2.default)(415, 'Unsupported charset "' + charset.toUpperCase() + '".');
  }

  // Get content-encoding (e.g. gzip)
  var encoding = (req.headers['content-encoding'] || 'identity').toLowerCase();
  var length = encoding === 'identity' ? req.headers['content-length'] : null;
  var limit = 200 * 1024; // 100kb
  var stream = decompressed(req, encoding);

  // Read body from stream.
  (0, _rawBody2.default)(stream, { encoding: charset, length: length, limit: limit }, function (err, body) {
    if (err) {
      return reject(err.type === 'encoding.unsupported' ? (0, _httpErrors2.default)(415, 'Unsupported charset "' + charset.toUpperCase() + '".') : (0, _httpErrors2.default)(400, 'Invalid body: ' + err.message + '.'));
    }

    try {
      // Decode and parse body.
      return resolve(parseFn(body));
    } catch (error) {
      return reject(error);
    }
  });
}

// Return a decompressed stream, given an encoding.
function decompressed(req, encoding) {
  switch (encoding) {
    case 'identity':
      return req;
    case 'deflate':
      return req.pipe(_zlib2.default.createInflate());
    case 'gzip':
      return req.pipe(_zlib2.default.createGunzip());
  }
  throw (0, _httpErrors2.default)(415, 'Unsupported content-encoding "' + encoding + '".');
}