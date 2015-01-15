from tty import setcbreak
from select import select
from termios import tcgetattr, tcsetattr, TCSAFLUSH
import sys
import os
from contextlib import contextmanager


CONTROL_CHARS = {
    # control characters
    'CTRL+@': '\x00',
    'CTRL+a': '\x01',
    'CTRL+b': '\x02',
    # 'CTRL+c': '\x03',  # not testable here
    'CTRL+d': '\x04',
    'CTRL+e': '\x05',
    'CTRL+f': '\x06',
    'CTRL+g': '\x07',
    'CTRL+h': '\x08',
    'CTRL+i': '\t',
    'CTRL+j': '\n',
    'CTRL+k': '\x0b',
    'CTRL+l': '\x0c',
    'CTRL+m': '\n',  # \r, converted to \n in cbreak mode
    'CTRL+n': '\x0e',
    'CTRL+o': '\x0f',
    'CTRL+p': '\x10',
    # 'CTRL+q': '\x11', # not testable here (XON)
    'CTRL+r': '\x12',
    # 'CTRL+s': '\x05', # not testable here (XOFF)
    'CTRL+t': '\x14',
    'CTRL+u': '\x15',
    'CTRL+v': '\x16',
    'CTRL+w': '\x17',
    'CTRL+x': '\x18',
    'CTRL+y': '\x19',
    # 'CTRL+z': '\x1a', # not testable here
    'CTRL+[': '\x1b',
    # 'CTRL+\\': '\x1c', # not testable here
    'CTRL+]': '\x1d',
    'CTRL+^': '\x1e',
    'CTRL+_': '\x1f'
}

ARROWS = {
    'left': '\x1b[D',
    'right': '\x1b[C',
    'up': '\x1b[A',
    'down': '\x1b[B',
    'home': '\x1b[H',
    'end': '\x1b[F',
    'page up': '\x1b[5~',
    'page down': '\x1b[6~'
}

ARROWS_CKM = {
    'left': '\x1bOD',
    'right': '\x1bOC',
    'up': '\x1bOA',
    'down': '\x1bOB',
    'home': '\x1bOH',
    'end': '\x1bOF',
    'page up': '\x1b[5~',
    'page down': '\x1b[6~'
}

# TODO: add missing keys like F-Keys, Tab, what about normal keys here?
KEYS_MOD = {
    'left': '\x1b[1;%sD',
    'right': '\x1b[1;%sC',
    'up': '\x1b[1;%sA',
    'down': '\x1b[1;%sB',
    'home': '\x1b[1;%sH',
    'end': '\x1b[1;%sF',
    'page up': '\x1b[5;%s~',
    'page down': '\x1b[6;%s~'
}


def read_input():
    s = os.read(sys.stdin.fileno(), 1)
    while select([sys.stdin.fileno()], [], [], 0.01)[0]:
        s += os.read(sys.stdin.fileno(), 1)
    return s


def test_keys(it, value=None):
    failed = []
    for descr, expected in it:
        if value:
            expected = expected % value
        sys.stdout.write(descr)
        sys.stdout.flush()
        got = read_input()
        print '', repr(expected), repr(got),
        if got == expected:
            print '\t\x1b[32mpass\x1b[0m'
        else:
            print '\t\x1b[31mfail\x1b[0m'
            failed.append((descr, expected, got))
    return failed
        

@contextmanager
def cbreak_console():
    attr = tcgetattr(sys.stdin.fileno())
    try:
        setcbreak(sys.stdin.fileno(), TCSAFLUSH)
        yield sys.stdin
    except:
        print
    tcsetattr(sys.stdin.fileno(), TCSAFLUSH, attr)


if __name__ == '__main__':
    print 'control characters'
    with cbreak_console():
        failed = test_keys(CONTROL_CHARS.items())
        print '%s/%s passed (%s%% coverage)' % (len(CONTROL_CHARS)-len(failed), len(CONTROL_CHARS),
                                                (len(CONTROL_CHARS)-len(failed))*100/len(CONTROL_CHARS))
    print
    print 'arrow keys (CKM low)'
    print '\x1b[?1l'
    with cbreak_console():
        failed = test_keys(ARROWS.items())
        print '%s/%s passed (%s%% coverage)' % (len(ARROWS)-len(failed), len(ARROWS),
                                                (len(ARROWS)-len(failed))*100/len(ARROWS))
    print
    print 'arrow keys (CKM high)'
    print '\x1b[?1h'
    with cbreak_console():
        failed = test_keys(ARROWS_CKM.items())
        print '%s/%s passed (%s%% coverage)' % (len(ARROWS_CKM)-len(failed), len(ARROWS_CKM),
                                                (len(ARROWS_CKM)-len(failed))*100/len(ARROWS_CKM))
    print '\x1b[?1l'
    print 'SHIFT + keys'
    with cbreak_console():
        failed = test_keys(KEYS_MOD.items(), '2')
        print '%s/%s passed (%s%% coverage)' % (len(KEYS_MOD)-len(failed), len(KEYS_MOD),
                                                (len(KEYS_MOD)-len(failed))*100/len(KEYS_MOD))
    print
    print 'ALT + keys'
    with cbreak_console():
        failed = test_keys(KEYS_MOD.items(), '3')
        print '%s/%s passed (%s%% coverage)' % (len(KEYS_MOD)-len(failed), len(KEYS_MOD),
                                                (len(KEYS_MOD)-len(failed))*100/len(KEYS_MOD))
    print
    print 'SHIFT + ALT + keys'
    with cbreak_console():
        failed = test_keys(KEYS_MOD.items(), '4')
        print '%s/%s passed (%s%% coverage)' % (len(KEYS_MOD)-len(failed), len(KEYS_MOD),
                                                (len(KEYS_MOD)-len(failed))*100/len(KEYS_MOD))
    print
    print 'CTRL + keys'
    with cbreak_console():
        failed = test_keys(KEYS_MOD.items(), '5')
        print '%s/%s passed (%s%% coverage)' % (len(KEYS_MOD)-len(failed), len(KEYS_MOD),
                                                (len(KEYS_MOD)-len(failed))*100/len(KEYS_MOD))
    print
    print 'SHIFT + CTRL + keys'
    with cbreak_console():
        failed = test_keys(KEYS_MOD.items(), '6')
        print '%s/%s passed (%s%% coverage)' % (len(KEYS_MOD)-len(failed), len(KEYS_MOD),
                                                (len(KEYS_MOD)-len(failed))*100/len(KEYS_MOD))
    print
    print 'ALT + CTRL + keys'
    with cbreak_console():
        failed = test_keys(KEYS_MOD.items(), '7')
        print '%s/%s passed (%s%% coverage)' % (len(KEYS_MOD)-len(failed), len(KEYS_MOD),
                                                (len(KEYS_MOD)-len(failed))*100/len(KEYS_MOD))
    print
    print 'SHIFT + ALT + CTRL + keys'
    with cbreak_console():
        failed = test_keys(KEYS_MOD.items(), '8')
        print '%s/%s passed (%s%% coverage)' % (len(KEYS_MOD)-len(failed), len(KEYS_MOD),
                                                (len(KEYS_MOD)-len(failed))*100/len(KEYS_MOD))
    print
    
    # TODO: DECKPAM/DECKPNM/DECNKM