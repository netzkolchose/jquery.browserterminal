/**
 * quick and hacky server with long polling for the demo
 */

var http = require('http'),
    url = require('url'),
    pty = require('pty.js'),
    uuid = require('node-uuid'),
    path = require('path'),
    filesys = require('fs');

var getPty = (function() {
    var ptys = {};
    return function(id) {
        if (!id) {
            var container = {id: uuid.v4(), pty: null, data: ''};
            container.pty = pty.spawn('bash', [], {
                name: 'xterm',
                cols: 80,
                rows: 25,
                cwd: process.env.HOME,
                env: process.env
            });
            container.pty.on('data', function(data) {
                container.data += data;
            });
            container.pty.on('resize', function(data) {
                console.log('resize event', data);
            });
            ptys[container.id] = container;
            return container;
        } else
            return ptys[id];
    }
}());

function blockingRead(response, term, t) {
    return function() {
        if (term.data || Date.now()-t > 10000) {
            response.writeHead(200, {'Content-Type': 'text/plain'});
            response.end(term.data);
            term.data = '';
        } else
        setTimeout(blockingRead(response, term, t), 30);
    }
}

var server = http.createServer(function (request, response) {
    var request_path = url.parse(request.url).pathname,
        term;
    if (request_path.indexOf('/start') == 0) {
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.end(getPty().id);
    } else if (request_path.indexOf('/read/') == 0) {
        term = getPty(request_path.split('/')[2]);
        if (term) {
            return blockingRead(response, term, Date.now())();
        } else {
            response.writeHead(404, {'Content-Type': 'text/plain'});
            response.end('404 Not Found\n');
        }
    } else if (request_path.indexOf('/write/') == 0) {
        term = getPty(request_path.split('/')[2]);
        if (term) {
            var queryData = '';
            request.on('data', function(data) {queryData += data;});
            request.on('end', function() {term.pty.write(new Buffer(queryData, 'base64'));});
            response.writeHead(200, {'Content-Type': 'text/plain'});
            response.end('');
        } else {
            response.writeHead(404, {'Content-Type': 'text/plain'});
            response.end('404 Not Found\n');
        }
    } else if (request_path.indexOf('/resize/') == 0) {
        term = getPty(request_path.split('/')[2]);
        if (term) {
            request.on('data', function(data) {
                var size = JSON.parse(data);
                term.pty.resize(size[0], size[1]);
                response.writeHead(200, {'Content-Type': 'application/json'});
                response.write(JSON.stringify({cols: term.pty.cols, rows: term.pty.rows}));
                response.end('');
            });
        } else {
            response.writeHead(404, {'Content-Type': 'text/plain'});
            response.end('404 Not Found\n');
        }
        
    } else {
        if (request_path == '/')
            request_path = '/index.html';
        var full_path = path.join(process.cwd(), request_path);
        filesys.exists(full_path, function (exists) {
            if (!exists) {
                response.writeHeader(404, {'Content-Type': 'text/plain'});
                response.end('404 Not Found\n');
                response.end();
            }
            else {
                filesys.readFile(full_path, 'binary', function (err, file) {
                    if (err) {
                        response.writeHeader(500, {'Content-Type': 'text/plain'});
                        response.write(err + '\n');
                        response.end();
                    }
                    else {
                        response.writeHeader(200);
                        response.write(file, 'binary');
                        response.end();
                    }
                });
            }
        });
    }
});

server.listen(8000);
console.log("Server running at http://127.0.0.1:8000/");
