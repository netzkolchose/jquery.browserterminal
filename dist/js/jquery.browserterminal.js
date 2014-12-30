/**
 * jQuery.fn.browserterminal
 *
 */
(function($) {
    function KeyHandler() {

        this.handle_keys = function(that) {
            return function(e) {
                // dont handle any other elements than terminals
                var term = $(document.activeElement).data('terminal');
                if (! term instanceof BrowserTerminal)
                    return;

//            term.widget.scrollTop(term.widget.prop('scrollHeight') - term.widget.innerHeight());
                var char;
                var evt = (e) ? e : window.event;       //IE reports window.event not arg
                if (evt.type == "keydown") {
                    var ret;
                    char = evt.keyCode;
                    if ((char && char < 16) ||                    // non printables -- also exclude char 0
                        (char > 16 && char < 32) ||     // avoid shift
                        (char > 32 && char < 41) ||     // navigation keys
                        char == 46) {                   // Delete Key (Add to these if you need)
                        ret = that.handleNonChar(evt, char, term);            // function to handle non Characters
                        nonChar = true;
                    } else
                        nonChar = false;
                } else {                                // This is keypress
                    if (nonChar) return;                // Already Handled on keydown
                    char = (evt.charCode) ?
                        evt.charCode : evt.keyCode;
                    if (char > 31)        // safari and opera
                        ret = that.handleChar(evt, char, term);               //
                }
                if (e) {
                    //        jQuery.Event(evt).stopPropagation();
                    //        jQuery.Event(evt).preventDefault();
                }                                // Non IE
                else if (evt.keyCode == 8)              // Catch IE backspace
                    evt.returnValue = false;            // and stop it!

                // special treatment for chrome f keys
                if ($.browser.chrome && evt.type == "keydown" && e.keyCode > 111 && e.keyCode < 124) {
                    term.chars += functionkeys[e.keyCode-111];
                    jQuery.Event(evt).preventDefault();
                }
                return ret;
            }
        };

        this.handleNonChar = function(e, c, term) {
            switch (c) {
                case 8:  term.chars += '\u0008'; break;
                case 9:  term.chars += '\t'; break;
                case 10: term.chars += '\n'; break;
                case 13: term.chars += '\r'; break;
                case 27: term.chars += '\u001b'; break;
                case 37: term.chars += term.arrowkey('left'); break;
                case 38: term.chars += term.arrowkey('up'); break;
                case 39: term.chars += term.arrowkey('right'); break;
                case 40: term.chars += term.arrowkey('down');  break;
                default:
                    console.debug('unhandled nonChar:', c);
            }
            //    jQuery.Event(e).stopPropagation();
            //    jQuery.Event(e).preventDefault();
            return false;
        };

        this.handleChar = function(e, c, term) {
            // --> f-keys differ in key/charcode
            if (e.keyCode > 111 && e.keyCode < 124 && e.charCode == 0) {
                // function key
                term.chars += functionkeys[e.keyCode-111];
                jQuery.Event(e).stopPropagation();
                //        jQuery.Event(e).preventDefault();
                return;
            }
            var char = String.fromCharCode(c);
            if (e.ctrlKey) {
                // see http://en.wikipedia.org/wiki/C0_and_C1_control_codes
                var chars = '@abcdefghijklmnopqrstuvwxyz[\]^_';
                var idx = chars.indexOf(char);
                if (idx != -1)
                    term.chars += String.fromCharCode(idx);
            } else
                term.chars += char;
            //    jQuery.Event(e).stopPropagation();
            //    jQuery.Event(e).preventDefault();
            return false;
        };

        // from http://codebits.glennjones.net/editing/getclipboarddata.htm
        this.handle_paste = function(e) {
            // dont handle any other elements than terminals
            var term = $(document.activeElement).data('terminal');
            if (! term instanceof BrowserTerminal)
                return;
            if (e.clipboardData) {
                term.chars += e.clipboardData.getData('text/plain');
            } else if (window.clipboardData) {  // IE
                term.chars += window.clipboardData.getData('Text');
            }
            jQuery.Event(e).stopPropagation();
            jQuery.Event(e).preventDefault();
        };

        // attach global handler to DOM
        document.onkeydown = this.handle_keys(this);
        document.onkeypress = this.handle_keys(this);
        document.onpaste = this.handle_paste;
    }

    if (window['_browserterminal_keyhandler'] == undefined)
        window['_browserterminal_keyhandler'] = new KeyHandler();
    
    function BrowserTerminal(el, options) {
        this.that = this;
        this.el = $(el);
        this.el = $(el);
        this.el.html('<pre class="_tw" contenteditable="true" spellcheck="false"></pre>');
        this.container = this.el.children('pre._tw');
        this.terminal = new AnsiTerminal(options.size[0], options.size[1]);
        this.parser = new AnsiParser(this.terminal);
        this.chars = '';
        
        // beep
        this.beepElement = new Audio('/audio/beep.mp3');
        if (this.beepElement.canPlayType('audio/ogg').match(/maybe|probably/i))
            this.beepElement.src = '/audio/beep.ogg';
        this.beepElement.volume = 1;
        $('body').append(this.beepElement);
        
        this.terminal.send = (function(that) {return function(s) {that.chars += s;}})(this);
        this.terminal.beep = (function(that) {return function(tone, duration) {that.beepElement.play();}})(this);
        this.setTitle = options.setTitle || function() {};

        this.write = function(s) {
            var buffer = this.terminal.buffer,
                row = this.terminal.cursor.row,
                col = this.terminal.cursor.col;
            // remove cursor from buffer
            if (this.terminal.show_cursor)
                if (buffer[row][col]) {
                    if (buffer[row][col].attributes)
                        buffer[row][col].attributes[3] = null;
                }
            // apply all changes to terminal
            this.parser.parse(s);
            // set new cursor to buffer
            buffer = this.terminal.buffer;
            row = this.terminal.cursor.row;
            col = this.terminal.cursor.col;
            if (this.terminal.show_cursor)
                if (buffer[row][col]) {
                    if (!buffer[row][col].attributes)
                        buffer[row][col].attributes = [null, null, null, null, null, null, null, null];
                    else
                        buffer[row][col].attributes = buffer[row][col].attributes.slice();
                    buffer[row][col].attributes[3] = (this.terminal.blinking_cursor) ? ' blc c' : ' c';
                }
        };

        this.arrowkey = function(s) {
            //var code = (this.terminal.cursor_key_mode) ? TERM_STRING['SS3'] : TERM_STRING['CSI'];
            var code = (this.terminal.cursor_key_mode) ? '\u001bO' : '\u001b[';
            switch (s) {
                case 'left'  : code +='D'; break;
                case 'up'    : code +='A'; break;
                case 'right' : code +='C'; break;
                case 'down'  : code +='B'; break;
            }
            return code;
        };

        this.toString = function() {
            var s = '',
                old_attr = null,
                attr = null;
            for (var i=0; i<this.terminal.buffer.length; ++i) {
                for (var j=0; j<this.terminal.buffer[i].length; ++j) {
                    attr = this.terminal.buffer[i][j].attributes;
                    if (old_attr !== attr) {
                        if (old_attr)
                            s += '</span>';
                        if (attr) {
                            if (attr[3])
                                s += '<span class="' + attr.join('').trim() + '" data-contents="' + (this.terminal.buffer[i][j].c  || '\xa0') + '">';
                            else
                                s += '<span class="' + attr.join('').trim() + '">';
                        }
                        old_attr = attr;
                    }
                    s += this.terminal.buffer[i][j].c || '\xa0';
                }
                if (old_attr) {
                    s += '</span>';
                    old_attr = null;
                }
                s += '\n';
            }
            return s;
        };

        this.init = function() {
            $.post('/start', '', this.connect(this.that));
        };
        this.connect = function(that) {
            return function(s) {
                that.id = s;
                setInterval(that.check_input(that), 20);
                $.post('/read/' + that.id, '', that.read(that));
            }
        };
        this.check_input = function(that) {
            return function() {
                if (that.chars == '')
                    return;
                $.post('/write/' + that.id, that.chars);
                that.chars = '';
            }
        };
        this.read = function(that) {
            // FIXME: get rid of the recursion!!!
            return function(s) {
                if (s) {
                    that.write(s);
                    that.container[0].innerHTML = that.toString();
                    $('#title').text(that.terminal.title);
                    that.setTitle.call(that.el, that.terminal.title);
                }
                $.post('/read/' + that.id, '', that.read(that));
            }
        };
        
        this.init();
    }



    $.fn.browserterminal = function(options) {
        var settings = $.extend({
            command: ['/bin/bash'],
            size: [80, 25],
            input_polling: 50,
            buffer_length: 200,
            resizable: false
        }, options);

        return this.each(function() {
            var term = new BrowserTerminal(this, settings);
            $(this).data('terminal', term);
            $(this).children('._tw').data('terminal', term);
            return this;
        });
    };
}(jQuery));


var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '/'
};

function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
        return entityMap[s];
    });
}

function JSFrontend(terminal) {
    this.terminal = terminal;
    this.id = null;
    this.container = $('pre');
    this.that = this;
    this.chars = '';
    this.command = '';

    this.check_input = function(that) {
        return function() {
            if (that.chars == '')
                return;
            that.terminal.write(that.chars);
            that.command += that.chars;
            if (that.chars.indexOf('\r') != -1) {
                that.terminal.write('\r\n');
                try {
                    var result = window.eval(that.command);
                    if (result !== undefined) {
                        if (result instanceof Node) {
                            var tmp = document.createElement("div");
                            tmp.appendChild(result.cloneNode(false));
                            result = tmp.innerHTML;
                        }
                        that.terminal.write('\x1b[36m' + escapeHtml(result) + '\x1b[0m');
                    }
                } catch(e) {
                    that.terminal.write('\x1b[38;5;196m' + e + '\x1b[0m');
                }
                that.terminal.write('\r\n>');
                that.command = '';
            }
            that.chars = '';
            that.container[0].innerHTML = that.terminal.toString();
        }
    };
    setInterval(this.check_input(this), 20);
    this.terminal.write('\x1b[20h\x1b[32m** Simple 5min Javascript REPL demo :) **\x1b[0m\r\n');
    this.terminal.write('>');
    this.container[0].innerHTML = this.terminal.toString();
}


var nonChar = false;

var functionkeys = {
    1   : '\u001bOP',
    2   : '\u001bOQ',
    3   : '\u001bOR',
    4   : '\u001bOS',
    5   : '\u001b[15~',
    6   : '\u001b[17~',
    7   : '\u001b[18~',
    8   : '\u001b[19~',
    9   : '\u001b[20~',
    10  : '\u001b[21~',
    11  : '\u001b[23~',
    12  : '\u001b[24~'
};