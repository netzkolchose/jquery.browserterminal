A jquery based browser terminal emulator using
[node-ansiparser](https://github.com/netzkolchose/node-ansiparser) and
[node-ansiterminal](https://github.com/netzkolchose/node-ansiterminal).

### FEATURES
* Unicode support (output only atm)
* mouse support
* resizable
* true color

### INSTALL

Run `npm install -production` in package directory for browser related stuff.

### DEMO

* With pty.js:

Run `npm install && npm start` and point your browser to http://localhost:8000

* With Python:

Run `python server.py` and point your browser to http://localhost:8000

### TODO
* Unicode input
* Mutation Observer for style attributes / automatic rescaling
* make read/write callbacks configurable
* tests
* amd/bower support
* documentation
* and much more...