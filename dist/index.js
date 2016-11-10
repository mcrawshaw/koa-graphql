'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

exports.default = graphqlHTTP;

var _graphql = require('graphql');

var _httpErrors = require('http-errors');

var _httpErrors2 = _interopRequireDefault(_httpErrors);

var _parseBody = require('./parseBody');

var _renderGraphiQL = require('./renderGraphiQL');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Middleware for express; takes an options object or function as input to
 * configure behavior, and returns an express middleware.
 */


/**
 * Used to configure the graphqlHTTP middleware by providing a schema
 * and other configuration options.
 *
 * Options can be provided as an Object, a Promise for an Object, or a Function
 * that returns an Object or a Promise for an Object.
 */
function graphqlHTTP(options) {
  if (!options) {
    throw new Error('GraphQL middleware requires options.');
  }

  return _regenerator2.default.mark(function middleware() {
    var _this = this;

    var req, request, response, schema, context, rootValue, pretty, graphiql, formatErrorFn, showGraphiQL, query, variables, operationName, validationRules, result, data, _data;

    return _regenerator2.default.wrap(function middleware$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            req = this.req;
            request = this.request;
            response = this.response;

            // Higher scoped variables are referred to at various stages in the
            // asynchronous state machine below.

            schema = void 0;
            context = void 0;
            rootValue = void 0;
            pretty = void 0;
            graphiql = void 0;
            formatErrorFn = void 0;
            showGraphiQL = void 0;
            query = void 0;
            variables = void 0;
            operationName = void 0;
            validationRules = void 0;
            result = void 0;
            _context2.prev = 15;
            return _context2.delegateYield(_regenerator2.default.mark(function _callee() {
              var optionsData, bodyData;
              return _regenerator2.default.wrap(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      _context.next = 2;
                      return Promise.resolve(typeof options === 'function' ? options(request, _this) : options);

                    case 2:
                      optionsData = _context.sent;

                      if (!(!optionsData || (typeof optionsData === 'undefined' ? 'undefined' : (0, _typeof3.default)(optionsData)) !== 'object')) {
                        _context.next = 5;
                        break;
                      }

                      throw new Error('GraphQL middleware option function must return an options object ' + 'or a promise which will be resolved to an options object.');

                    case 5:
                      if (optionsData.schema) {
                        _context.next = 7;
                        break;
                      }

                      throw new Error('GraphQL middleware options must contain a schema.');

                    case 7:

                      // Collect information from the options data object.
                      schema = optionsData.schema;
                      context = optionsData.context || _this;
                      rootValue = optionsData.rootValue;
                      pretty = optionsData.pretty;
                      graphiql = optionsData.graphiql;
                      formatErrorFn = optionsData.formatError;

                      validationRules = _graphql.specifiedRules;
                      if (optionsData.validationRules) {
                        validationRules = validationRules.concat(optionsData.validationRules);
                      }

                      // GraphQL HTTP only supports GET and POST methods.

                      if (!(request.method !== 'GET' && request.method !== 'POST')) {
                        _context.next = 18;
                        break;
                      }

                      response.set('Allow', 'GET, POST');
                      throw (0, _httpErrors2.default)(405, 'GraphQL only supports GET and POST requests.');

                    case 18:
                      _context.next = 20;
                      return (0, _parseBody.parseBody)(req, request);

                    case 20:
                      bodyData = _context.sent;
                      _context.next = 23;
                      return new Promise(function (resolve) {
                        bodyData = bodyData || {};
                        var urlData = request.query;
                        showGraphiQL = graphiql && canDisplayGraphiQL(request, urlData, bodyData);

                        // Get GraphQL params from the request and POST body data.
                        var params = getGraphQLParams(urlData, bodyData);
                        query = params.query;
                        variables = params.variables;
                        operationName = params.operationName;

                        // If there is no query, but GraphiQL will be displayed, do not produce
                        // a result, otherwise return a 400: Bad Request.
                        if (!query) {
                          if (showGraphiQL) {
                            resolve(null);
                          }
                          throw (0, _httpErrors2.default)(400, 'Must provide query string.');
                        }

                        // GraphQL source.
                        var source = new _graphql.Source(query, 'GraphQL request');

                        // Parse source to AST, reporting any syntax error.
                        var documentAST = void 0;
                        try {
                          documentAST = (0, _graphql.parse)(source);
                        } catch (syntaxError) {
                          // Return 400: Bad Request if any syntax errors errors exist.
                          response.status = 400;
                          resolve({ errors: [syntaxError] });
                        }

                        // Validate AST, reporting any errors.
                        var validationErrors = (0, _graphql.validate)(schema, documentAST, validationRules);
                        if (validationErrors.length > 0) {
                          // Return 400: Bad Request if any validation errors exist.
                          response.status = 400;
                          resolve({ errors: validationErrors });
                        }

                        // Only query operations are allowed on GET requests.
                        if (request.method === 'GET') {
                          // Determine if this GET request will perform a non-query.
                          var operationAST = (0, _graphql.getOperationAST)(documentAST, operationName);
                          if (operationAST && operationAST.operation !== 'query') {
                            // If GraphiQL can be shown, do not perform this query, but
                            // provide it to GraphiQL so that the requester may perform it
                            // themselves if desired.
                            if (showGraphiQL) {
                              resolve(null);
                            }

                            // Otherwise, report a 405: Method Not Allowed error.
                            response.set('Allow', 'POST');
                            throw (0, _httpErrors2.default)(405, 'Can only perform a ' + operationAST.operation + ' operation ' + 'from a POST request.');
                          }
                        }

                        // Perform the execution, reporting any errors creating the context.
                        try {
                          resolve((0, _graphql.execute)(schema, documentAST, rootValue, context, variables, operationName));
                        } catch (contextError) {
                          // Return 400: Bad Request if any execution context errors exist.
                          response.status = 400;
                          resolve({ errors: [contextError] });
                        }
                      });

                    case 23:
                      result = _context.sent;

                    case 24:
                    case 'end':
                      return _context.stop();
                  }
                }
              }, _callee, _this);
            })(), 't0', 17);

          case 17:
            _context2.next = 23;
            break;

          case 19:
            _context2.prev = 19;
            _context2.t1 = _context2['catch'](15);

            // If an error was caught, report the httpError status, or 500.
            response.status = _context2.t1.status || 500;
            result = { errors: [_context2.t1] };

          case 23:

            // Format any encountered errors.
            if (result && result.errors) {
              result.errors = result.errors.map(formatErrorFn || _graphql.formatError);
            }

            // If allowed to show GraphiQL, present it instead of JSON.
            if (showGraphiQL) {
              data = (0, _renderGraphiQL.renderGraphiQL)({
                query: query, variables: variables,
                operationName: operationName, result: result
              });

              response.type = 'text/html';
              response.body = data;
            } else {
              // Otherwise, present JSON directly.
              _data = JSON.stringify(result, null, pretty ? 2 : 0);

              response.type = 'application/json';
              response.body = _data;
            }

          case 25:
          case 'end':
            return _context2.stop();
        }
      }
    }, middleware, this, [[15, 19]]);
  });
}

/**
 * Helper function to get the GraphQL params from the request.
 */
function getGraphQLParams(urlData, bodyData) {
  // GraphQL Query string.
  var query = urlData.query || bodyData.query;
  if (typeof query !== 'string') {
    query = null;
  }

  // Parse the variables if needed.
  var variables = urlData.variables || bodyData.variables;
  if (typeof variables === 'string') {
    try {
      variables = JSON.parse(variables);
    } catch (error) {
      throw (0, _httpErrors2.default)(400, 'Variables are invalid JSON.');
    }
  } else if ((typeof variables === 'undefined' ? 'undefined' : (0, _typeof3.default)(variables)) !== 'object') {
    variables = null;
  }

  // Name of GraphQL operation to execute.
  var operationName = urlData.operationName || bodyData.operationName;
  if (typeof operationName !== 'string') {
    operationName = null;
  }

  return { query: query, variables: variables, operationName: operationName };
}

/**
 * Helper function to determine if GraphiQL can be displayed.
 */
function canDisplayGraphiQL(request, urlData, bodyData) {
  // If `raw` exists, GraphiQL mode is not enabled.
  var raw = urlData.raw !== undefined || bodyData.raw !== undefined;
  // Allowed to show GraphiQL if not requested as raw and this request
  // prefers HTML over JSON.
  return !raw && request.accepts(['json', 'html']) === 'html';
}
module.exports = exports['default'];