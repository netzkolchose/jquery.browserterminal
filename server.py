from bottle import route, post, static_file, request, response
import os
from select import select
from pty import fork
from termios import TIOCSWINSZ, TIOCGWINSZ
from struct import pack, unpack
from fcntl import ioctl
from os import execl, closerange
from time import sleep, time
from uuid import uuid4
import codecs
from json import loads, dumps
from base64 import b64decode

# A quick and dirty server backend for development.

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def set_termsize(fd, row, col):
    ioctl(fd, TIOCSWINSZ, pack('HHHH', row, col, 0, 0))


def get_termsize(fd):
    return unpack('hh', ioctl(fd, TIOCGWINSZ, '1234'))


class Terminal(object):
    def __init__(self, cmd=None, size=(80, 25)):
        self._width, self._height = size
        self.master = None
        self.child = None
        child, master = fork()
        if child == 0:
            closerange(3, 255)
            execl('/bin/bash', '')
            #execl('/usr/bin/ssh', 'localhost')
        self.child = child
        self.master = master
        set_termsize(self.master, self._height, self._width)
        self.error_buffer = ''
        self.read_buffer = ''
        self._decode_handler_id = '_td_' + hex(id(self))
        codecs.register_error(self._decode_handler_id, self._term_decode)

    def close(self):
        codecs.register_error('_td_' + hex(id(self)), lambda _: u'')

    def receive(self):
        self.read_buffer = self.error_buffer
        self.error_buffer = ''
        while select([self.master], [], [], 0.001)[0] and len(self.read_buffer) < 1048576:
            self.read_buffer += os.read(self.master, 4096)
        return self.read_buffer.decode('utf8', self._decode_handler_id)

    def send(self, s):
        os.write(self.master, s)

    def _term_decode(self, exc):
        if not isinstance(exc, UnicodeDecodeError):
            raise TypeError('term_decode - handler only handles decoding')
        if exc.end == len(exc.object):
            self.error_buffer = exc.object[exc.start:exc.end]
            return u'', exc.end
        else:
            return u'\ufffd', exc.end

terminals = {}


@route('/node_modules/<filename:re:.+>')
def js(filename):
    return static_file(filename, root=os.path.join(BASE_DIR, 'node_modules'))


@route('/dist/<filename:re:.+>')
def css(filename):
    return static_file(filename, root=os.path.join(BASE_DIR, 'dist'))


@route('/audio/<filename:re:.+>')
def css(filename):
    return static_file(filename, root=os.path.join(BASE_DIR, 'audio'))


@route('/')
def simple():
    return static_file('index.html', BASE_DIR)


@post('/start')
def start():
    # options = loads(request.body.read())
    # cmd = options.get('cmd').split() or ['/bin/bash']
    # size = options.get('size') or [80, 25]
    term = Terminal(cmd=['/bin/bash'], size=[80, 25])

    # generate unique id
    uuid = uuid4().hex
    while terminals.get(uuid):
        uuid = uuid4().hex

    terminals[uuid] = term
    return str(uuid)


@post('/read/<uid>')
def _read(uid):
    response.headers['Content-Type'] = 'text/plain; charset=UTF-8'
    term = terminals.get(uid)
    if not term:
        return 'Error' # TODO: return errorcode
    start = time()
    while True:
        sleep(.01)
        res = term.receive()
        if res or time()-start > 10:
            return res

@post('/write/<uid>')
def _write(uid):
    term = terminals.get(uid)
    if not term:
        return 'Error' # TODO: return errorcode

    read = loads(request.body.read())
    # binary always comes as base64
    # convert others to right encoding
    if read['e'] == 'base64':
        data = read['c'].decode('base64')
    else:
        data = read['c'].encode(read['e'])
    term.send(data)
    return ''


@post('/resize/<uid>')
def resize(uid):
    rows, cols = loads(request.body.read())
    term = terminals.get(uid)
    set_termsize(term.master, cols, rows)
    rows, cols = get_termsize(term.master)
    return {'cols': cols, 'rows': rows}


from bottle import ServerAdapter, run
from SocketServer import ThreadingMixIn
from wsgiref.simple_server import make_server, WSGIServer


class ThreadingWSGIServer(ThreadingMixIn, WSGIServer, ServerAdapter):
    pass


class ThreadingAdapter(ServerAdapter):
    def run(self, handler):
        srv = make_server(self.host, self.port, handler, ThreadingWSGIServer,
                          **self.options)
        srv.serve_forever()

run(server=ThreadingAdapter, host='127.0.0.1', port=8000)
