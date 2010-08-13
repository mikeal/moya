
var fooServer = http.createServer(function (req, resp) {
  resp.writeHead(200);
  resp.write('foo');
  resp.end();
})
var barServer = http.createServer(function (req, resp) {
  resp.writeHead(200);
  resp.write('bar');
  resp.end();
})
