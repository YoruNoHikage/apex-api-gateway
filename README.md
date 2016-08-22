Apex API Gateway
================

`apex-api-gateway` helps you deploying your Apex project into API Gateway. This is an early version, only basic commands are available.
If you need more advanced features, you can use [AWS CLI](https://aws.amazon.com/fr/cli/).

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
