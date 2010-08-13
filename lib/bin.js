var moya = require('./main')
  , fs = require('fs')
  , sys = require('sys')
  , path = require('path')
  ;

var config = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-config.json')))
  
var m = new moya.Moya(config)