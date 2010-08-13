var fs = require('fs')
  , sys = require('sys')
  , http = require('http')
  , pool = require('pool')
  , events = require('events')
  , streams = require('streams')
  , fileserver = require('./fileserver')
  ;

var services = {
  http : function (options, moya) {
      var s = http.createServer( function (request, response) {
        moya.emit('request', request, response);
      });
      s.listen(options.port);
      return s;
    }
  , https : function (options, moya) {
      var crypto = require('crypto')
        , s = http.createServer( function (request, response) {
        moya.emit('request', request, response);
      });
      if (options.private_key) var privateKey = fs.readFileSync(options.private_key);
      if (options.certificate) var certificate = fs.readFileSync(options.certificate);
      var credentials = crypto.createCredentials({key: privateKey, cert: certificate});
      s.setSecure(credentials);
      s.listen(options.port);
      return s;
    }
}

function Moya (config) {
  this.config = {};
  this.runningServices = {};
  this.poolManager = pool.createPoolManager();
  this.on('request', this.listener);
  this.reloadConfig(config)
}
sys.inherits(Moya, events.EventEmitter);
Moya.prototype.reloadConfig = function (config) {
  // bring up and down the http service
  if (this.config.http_port) {
    if (this.config.http_port !== config.http_port) {
      this.stop('http');
      this.start('http', {port: config.http_port});
    }
  } else if (config.http_port) {
    this.start('http', {port: config.http_port});
  }
  
  // bring up and down the https service
  if (this.config.https_port) {
    if (this.config.https_port !== config.https_port) {
      this.stop('https');
      this.start('https', {port: config.https_port});
    }
  } else if (config.https_port){
    this.start('https', {port: config.https_port});
  }
  
  // proxy pool settings
  if (config.proxy_pool_min && (this.config.proxy_pool_min !== config.proxy_pool_min)) {
    this.poolManager.setMinClients(config.proxy_pool_min);
  }
  if (config.proxy_pool_max && (this.config.proxy_pool_max !== config.proxy_pool_max)) {
    this.poolManager.setMaxClients(config.proxy_pool_max);
  }
  
  
  if (config.locations) {
    // handle root paths
    for (i in config.locations) {
      var loc = config.locations[i];
      if (loc.directory) {
        // handle directories
        if (typeof loc.directory === "string") {
          loc.directory = fileserver.createListener(loc.directory);
          if (i[i.length] !== '/') i += '/';
          loc.directory.location = i;
        }
        if (typeof loc.directory === "object") {
          // TODO : handle more options that just path
          loc.directory = fileserver.createListener(loc.directory.path);
          if (i[i.length] !== '/') i += '/';
          loc.directory.location = i;
        }
      }
    }
  }
  if (config.vhosts) {
    // handle vhosts
    for (i in config.vhosts) {
      if (config.vhosts[i].directory) {
        if (typeof config.vhosts[i].directory === "string") {
          config.vhosts[i].directory = fileserver.createListener(config.vhosts[i].directory);
        }
        if (typeof config.vhosts[i].directory === "object") {
          // TODO : handle more options that just path
          config.vhosts[i].directory = fileserver.createListener(config.vhosts[i].directory.path);
        }
      }
    }
  }
  
}
Moya.prototype.start = function (service, options) {
  this.runningServices[service] = services[service](options, this);
}
Moya.prototype.stop = function () {
  if (this.runningServices[service]) this.runningServices[service].stop();
}
Moya.prototype.listener = function (request, response) {
  if (request.url.slice(0, '__moya_admin'.length) === '__moya_admin') this.admin(request, response);
  if (this.config.vhosts && request.headers.host) {
    var i = request.headers.host.indexOf(":")
      , host = (i !== -1) ? request.headers.host.slice(0, i) : request.headers.host
      ;
      
    if (this.config.vhosts[host]) {
      var c = this.config.vhosts[host];
      if (c.proxy_pass) {
        return sys.pump(this.chain(this.proxy(request, response, c.proxy_pass), c), response);
      }
      if (c.directory) {
        return sys.pump(this.chain(this.fileServe(request, response, c.directory), c), response);
      }
    }
  }
  
}
Moya.prototype.proxy = function (request, response, info) {
  
}
Moya.prototype.fileServe = function (request, response, listener) {
  if (listener.location) {request.url.replace(listener.location, '')} 
  return listener(request, response)
}
Moya.prototype.chain = function (startStream, conf) {
  var s = startStream;
  if (conf.compress) ; //do some compression
  if (conf.cache) ; // do some cache shit
  return s;
}

exports.Moya = Moya;
