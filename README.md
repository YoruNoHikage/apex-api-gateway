Apex API Gateway
================

`apex-api-gateway` helps you deploying your Apex project into API Gateway. This is an early version, only basic commands are available.
If you need more advanced features, you can use [AWS CLI](https://aws.amazon.com/fr/cli/).

[![npm version](https://img.shields.io/npm/v/apex-api-gateway.svg?style=flat-square)](https://www.npmjs.com/package/apex-api-gateway)

_This project was inspired by [serverless-ci-example](https://github.com/rotemtam/serverless-ci-example)'s Python deploy script._

Installation
------------

`npm install -g apex-api-gateway`

Usage
-----

```
Usage: apex-api-gateway <command> [options]

Commands:
  create <name> [description] [cloneFrom]  Create a new REST API on AWS API Gateway
  update                                   Update the REST API with the new Swagger definitions

Options:
  -c, --config  Apex project JSON file location
  --help        Display help [boolean]
```

To create an API and update Apex's configuration automatically, just simply do :

`apex-api-gateway create 'My Awesome API'`

Define swagger file in every `function.json` you have and main project.json (this should be done automatically later).
You can check out the [Apex API Gateway Boilerplate](https://github.com/YoruNoHikage/apex-api-gateway-boilerplate).

And to update API :

`apex-api-gateway update`

Writing your swagger definitions
--------------------------------

### project.json

After initiating your Apex project, you'll get a `project.json` containing everything Apex needs to run your lambas.
We can then use it to define other definitions under a `x-api-gateway` key, and here's what you can define.

- `base_path`
- `stage_name`
- `rest-api-id`: You can define this key yourself or let the `create` command do it for you

#### `paths`

You can use this key to match your functions's path and add default Swagger definition.
For example, adding CORS to API Gateway can be done like this:

```js
"paths": {
  ".+": { // this will match every path
    "options": { // adding options for preflight requests
      /*
        You can add CORS definitions for OPTIONS request here.
        Check out config example: http://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html#enable-cors-for-resource-using-swagger-importer-tool
      */
    }
  },
  "/sweets(.+)": { // match a /sweets path and all the descendants
    "get": { /* ... */ },
    "put": { /* ... */ }
  }
}
```

**Warning:** `^` is prepended and `$` is appended to the regex matching because I find it easier to match a plain path just writing it.
This is questionable and if you disagree, you can open an issue to argue. :P

#### `swagger-func-template`

This template represents the default swagger definition for every function defined in your Apex project.
_The property's behavior is very similar to `paths` property and will likely be integrated into it in the future.
The only difference is this definition is method agnostic._

Example:
```js
"swagger-func-template": {
  "consumes": ["application/json"],
  "produces": ["application/json"],
  "responses": { /* ... */ },
  "x-amazon-apigateway-integration": { /* ... */ },
  "x-amazon-apigateway-auth" : { /* ... */ }
}
```

### myFunction/function.json

This one is easier to define, just define your method in a `x-api-gateway` key like this:

```js
"x-api-gateway": {
  "method": "post",
  "path": "/sweets",
  "parameters":[/* ... */]
  /* ... */
}
```

`method` and `paths` are required since it will be used as a key for the Swagger main file. The rest is only regular Swagger definition.
