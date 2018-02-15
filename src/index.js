#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const defaultsDeep = require('lodash.defaultsdeep');
const entries = require('lodash.topairs');
const yargs = require('yargs');
const AWS = require('aws-sdk');
const apigateway = new AWS.APIGateway();

const args = yargs
              .usage('Usage: $0 <command> [options]')
              .alias('c', 'config')
              .nargs('c', 1)
              .describe('c', 'Apex project JSON file location')
              .command('create <name> [description] [cloneFrom]', 'Create a new REST API on AWS API Gateway', {
                force: { alias: 'f', describe: 'Force creating REST API overriding existing configuration' }
              }, create)
              .command('update', 'Update the REST API with the new Swagger definitions', {
                stdout: { describe: 'Output swagger to console without deploying' },
              }, update)
              .help()
              .argv;

function create({ name, description = null, cloneFrom = '', config = './project.json', force }) {
  const projectConfig = loadConfig(config);

  if(!force && projectConfig && projectConfig['x-api-gateway'] && projectConfig['x-api-gateway']['rest-api-id']) {
    console.error('A REST API id is already defined the project.json, if you really want to override this use -f parameter');
    return;
  }

  var params = {
    name,
    cloneFrom,
    description,
  };
  apigateway.createRestApi(params, (err, data) => {
    if (err) {
      console.log(err, err.stack);
      return;
    }

    const updatedConfig = JSON.stringify(
      Object.assign({}, projectConfig, {
        ['x-api-gateway']: Object.assign({}, projectConfig['x-api-gateway'], {'rest-api-id': data.id})
      }),
      null,
      2
    );

    fs.writeFile(config, updatedConfig, (err) => {
      if (err) throw err;

      console.log('Success! Now you can push your REST API using update command.');
    });
  });
}

function update({ config, stdout }) {
  const projectConfig = loadConfig(config);

  if(!projectConfig['x-api-gateway'] || !projectConfig['x-api-gateway']['rest-api-id']) {
    throw new Error('Missing REST API id, you might want to use create command first.');
  }

  const restApiId = projectConfig['x-api-gateway']['rest-api-id'];

  const renderMethod = (name, { description, ['x-api-gateway']: {
    parameters,
    consumes,
    produces,
    responses,
    ['x-amazon-apigateway-integration']: integration = {},
  } }) => {
    const template = projectConfig['x-api-gateway']['swagger-func-template'];
    return defaultsDeep(
      {
        description,
        ['x-amazon-apigateway-integration']: {
          httpMethod: 'post',
          uri: template['x-amazon-apigateway-integration'].uri.replace('{{functionName}}', `${projectConfig.name}_${name}`),
          responses: integration.responses,
        },
        parameters,
        consumes,
        produces,
        responses,
      },
      template
    );
  };

  const renderPaths = (functions) => {
    const paths = {};

    functions.map(({ name, definition }) => {
      const { path, method } = definition['x-api-gateway'];
      if(!path || !method) {
        return;
      }

      paths[path] = paths[path] || {};
      paths[path][method] = renderMethod(name, definition);
    });

    entries(projectConfig['x-api-gateway']['paths']).forEach(([key, value]) => {
      const keyPattern = new RegExp(`^${key}$`);
      const matchedPaths = entries(paths).filter(([path]) => keyPattern.test(path));

      matchedPaths.forEach(([path, pathValue]) => {
        defaultsDeep(pathValue, value); // paths local mutation seems to be the best
      });
    });

    return paths;
  };

  const functionsDefs = fs
    .readdirSync(path.join(process.cwd(), './functions'))
    .map((folder) => {
      try {
        const functionDef = require(path.join(process.cwd(), `./functions/${folder}/function.json`));

        return {
          name: folder,
          definition: functionDef,
        };
      } catch(e) { return; }
    })
    .filter((i) => i);

  const swagger = {
    "swagger": "2.0",
    "info": {
      "version": (new Date()).toISOString(),
      "title": projectConfig.name,
    },
    "basePath": projectConfig['x-api-gateway'].base_path,
    "schemes": [
      "https"
    ],
    "paths": renderPaths(functionsDefs),
    "securityDefinitions": {
      "api_key": {
        "type": "apiKey",
        "name": "x-api-key",
        "in": "header"
      }
    },
    "definitions": {
      "Empty": {
        "type": "object"
      }
    }
  };

  if(stdout) {
    process.stdout.write(JSON.stringify(swagger, null, 2));
    return;
  }

  console.log('Pushing REST API...');

  const params = {
    body: JSON.stringify(swagger),
    restApiId,
    mode: 'overwrite',
  };
  apigateway.putRestApi(params, (err, data) => {
    if (err) {
      console.log(err, err.stack);
      return;
    }

    console.log('Updated API with success!');
    console.log('Deploying REST API...');

    const params = {
      restApiId,
      stageName: projectConfig['x-api-gateway']['stage_name'],
    };
    apigateway.createDeployment(params, (err, data) => {
      if (err) {
        console.log(err, err.stack);
        return;
      }

      console.log('API deployed successfully!');
    });
  });
}

function loadConfig(projectFile = './project.json') {
  return require(path.join(process.cwd(), projectFile));
}
