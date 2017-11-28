/* @flow */

export const STARTER_CODE = `// Welcome to Launchpad!
// Log in to edit and save pads, run queries in GraphiQL on the right.
// Click "Download" above to get a zip with a standalone Node.js server.
// See docs and examples at https://github.com/apollographql/awesome-launchpad

// graphql-tools combines a schema string with resolvers.
import { makeExecutableSchema } from 'graphql-tools';

// Construct a schema, using GraphQL schema language
const typeDefs = \`
  type Query {
    hello: String
  }
\`;

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    hello: (root, args, context) => {
      return 'Hello world!';
    },
  },
};

// Required: Export the GraphQL.js schema object as "schema"
export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Optional: Export a function to get context from the request. It accepts two
// parameters - headers (lowercased http headers) and secrets (secrets defined
// in secrets section). It must return an object (or a promise resolving to it).
export function context(headers, secrets) {
  return {
    headers,
    secrets,
  };
};

// Optional: Export a root value to be passed during execution
// export const rootValue = {};

// Optional: Export a root function, that returns root to be passed
// during execution, accepting headers and secrets. It can return a
// promise. rootFunction takes precedence over rootValue.
// export function rootFunction(headers, secrets) {
//   return {
//     headers,
//     secrets,
//   };
// };
`;

export const RUNNER_WRAPPER = (code: string) =>
  `
  var __LAUNCHPAD__runtimeError;
  try {
    ${code};
  } catch (e) {
    __LAUNCHPAD__runtimeError = e;
  }

  (function() {
    if (__LAUNCHPAD__runtimeError) {
      module.exports = function webtask(context, callback) {
        callback(__LAUNCHPAD__runtimeError);
      };
      return;
    }

    var graphql = require('graphql');
    var GraphQLExtensions = require('graphql-extensions')
    var Engine = require('apollo-engine').Engine;
    var express = require('express');
    var Webtask = require('webtask-tools');
    var bodyParser = require('body-parser');
    var graphqlHTTP = require('express-graphql');
    var Tracing = require('apollo-tracing');

    var server;
    var engine;

    var schemaFunction =
      exports.schemaFunction ||
      function() {
        return exports.schema;
      };
    var schema;
    var rootValue = exports.rootValue || {};
    var rootFunction =
      exports.rootFunction ||
      function() {
        return rootValue;
      };
    var contextFn =
      exports.context ||
      function(headers, secrets) {
        return Object.assign(
          {
            headers: headers,
          },
          secrets
        );
      };

    Object.keys(exports).forEach(function(key) {
      if (
        [
          'default',
          'schema',
          'schemaFunction',
          'context',
          'rootValue',
          'rootFunction',
        ].indexOf(key) === -1
      ) {
        throw new Error('Unknown export: ' + key);
      }
    });

    if (!exports.schema && !exports.schemaFunction) {
      throw new Error(
        'You need to export object with a field \`schema\` or a function \`schemaFunction\` to run a Pad.'
      );
    }

    process.env["GOMAXPROCS"] = "1"

    if (!server) {
      server = express();
      server.use(
        '/',
        (req, res, next) => {
          req.userContext = JSON.parse(
            req.webtaskContext.secrets.userContext
          ).reduce(function(acc, next) {
            acc[next.key] = next.value;
            return acc;
          }, {});
          if (!schema) {
            schema = schemaFunction(req.userContext);
          }
          next();
        },
        (req, res, next) => {
          if (engine) {
            engine.expressMiddleware()(req, res, next);
          } else {
            next();
          }
        },
        bodyParser.json(),
        (req, res, next) => {
          req._traceCollector = new Tracing.TracingExtension();
          req._traceCollector.requestDidStart();
          next();
        },
        graphqlHTTP(req =>
          Promise.all([
            Promise.resolve(schema),
            Promise.resolve(contextFn(req.headers, req.userContext)),
            Promise.resolve(rootFunction(req.headers, req.userContext))
          ]).then((results) => ({
            schema: GraphQLExtensions.enableGraphQLExtensions(results[0]),
            context: Object.assign({},
              results[1],
              {
                _extensionStack: new GraphQLExtensions.GraphQLExtensionStack([req._traceCollector]),
              }
            ),
            root: results[2],
            extensions: () => {
              req._traceCollector.requestDidEnd();
              const tracing = req._traceCollector.format();
              const result = {};
              result[tracing[0]] = tracing[1];
              return result;
            }
          }))
        )
      );
    }

    var webtask = Webtask.fromExpress(server);

    module.exports = function (context, req, res) {
      req.userContext = JSON.parse(
        context.secrets.userContext
      ).reduce(function(acc, next) {
        acc[next.key] = next.value;
        return acc;
      }, {});

      if (!engine && req.userContext.APOLLO_ENGINE_KEY) {
        engine = new Engine({
          endpoint: '/',
          engineConfig: {
            apiKey: req.userContext.APOLLO_ENGINE_KEY,
            reporting: {
              debugReports: true
            },
            origins: [
              {
                http: {
                  url: context.secrets.url,
                },
              },
            ],
          },
        });
        engine.start();
      }

      webtask(context, req, res);
    }
  })();
`;
