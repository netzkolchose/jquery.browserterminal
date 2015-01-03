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
    
    // html escape
    var entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#47;'
    };

    function escapeHtml(string) {
        return String(string).replace(/[&<>"'\/]/g, function (s) {
            return entityMap[s];
        });
    }

    // fast innerHTML replacement
    function replaceHtml(el, html) {
        //var oldEl = typeof el === "string" ? document.getElementById(el) : el;
        var oldEl = el;
        /*@cc_on // Pure innerHTML is slightly faster in IE
         oldEl.innerHTML = html;
         return oldEl;
         @*/
        var newEl = oldEl.cloneNode(false);
        newEl.innerHTML = html;
        oldEl.parentNode.replaceChild(newEl, oldEl);
        /* Since we just removed the old element from the DOM, return a reference
         to the new element, which can be used to restore variable references. */
        return newEl;
    }
    
    function BrowserTerminal(el, options) {
        this.that = this;
        this.el = $(el);
        this.el = $(el);
        this.el.html('<pre class="_tw" contenteditable="true" spellcheck="false"><span class="scrollbuffer"><span class="_sc"></span></span><span class="buffer"></span></pre>');
        this.container = this.el.children('pre._tw');
        this.el_scroll = this.container.children('.scrollbuffer');
        this.el_sc = this.container.find('._sc')[0];
        this.el_buffer = this.container.children('.buffer')[0];
        this.terminal = new AnsiTerminal(options.size[0], options.size[1]);
        this.parser = new AnsiParser(this.terminal);
        this.chars = '';
        this.scroll_buffer = [];
        this.bufferLength = options.bufferLength;
        this.inputPolling = options.inputPolling;
        
        // beep
        this.beepElement = new Audio('/audio/beep.mp3');
        if (this.beepElement.canPlayType('audio/ogg').match(/maybe|probably/i))
            this.beepElement.src = '/audio/beep.ogg';
        this.beepElement.volume = 1;
        $('body').append(this.beepElement);
        
        // callbacks
        this.terminal.appendScrollBuffer = (function(that){
            return function(elems){
                //that.scroll_buffer.push(elems);
                that.scroll_buffer.push(that.printScrollBuffer([elems]));
            }
        })(this);
        this.terminal.clearScrollBuffer = (function(that){
            return function(){
                that.scroll_buffer=[];
                that.el_scroll[0].innerHTML = '<span class="_sc"></span>';
                that.el_sc = that.container.find('._sc')[0];
            }
        })(this);
        this.terminal.send = (function(that) {
            return function(s) {
                that.chars += s;
            }
        })(this);
        this.terminal.beep = (function(that) {
            return function(tone, duration) {
                that.beepElement.play();
            }
        })(this);
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
                    s += escapeHtml(this.terminal.buffer[i][j].c || '\xa0');
                }
                if (old_attr) {
                    s += '</span>';
                    old_attr = null;
                }
                s += '\n';
            }
            return s;
        };
        
        this.printScrollBuffer = function(buffer) {
            var s = '',
                old_attr = null,
                attr = null;
            for (var i=0; i<buffer.length; ++i) {
                for (var j=0; j<buffer[i].length; ++j) {
                    attr = buffer[i][j].attributes;
                    if (old_attr !== attr) {
                        if (old_attr)
                            s += '</span>';
                        if (attr) {
                                s += '<span class="' + attr.join('').trim() + '">';
                        }
                        old_attr = attr;
                    }
                    s += escapeHtml(buffer[i][j].c || '\xa0');
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
                setInterval(that.check_input(that), that.inputPolling);
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
                var old_string = '';
                if (s) {
                    // save old scroll offset and buffer
                    var scrollLength = that.scroll_buffer.length;
                    var oldBuffer = that.terminal.buffer;
                    
                    // try to keep responsive on fast big data
                    if (s.length > 1000000)
                        old_string = s.slice(1000000);
                    that.write(s.slice(0, 1000000));
                    
                    // scroll handling and output - FIXME: make it responsive for big data
                    if (that.bufferLength) {
                        var scrollBlock = 1000;  // put n lines into one scroll block
                        if (that.terminal.buffer == that.terminal.normal_buffer) {
                            if (scrollLength < that.scroll_buffer.length) {
                                var start = Math.floor(scrollLength / scrollBlock);
                                var end = Math.floor(that.scroll_buffer.length / scrollBlock);
                                that.el_sc = replaceHtml(that.el_sc,
                                    that.scroll_buffer.slice(start * scrollBlock, start * scrollBlock + scrollBlock).join(''));
                                for (var i = start + 1; i <= end; ++i) {
                                    if ((end-i) > (that.bufferLength/scrollBlock)) {
                                        i -= 1;
                                        end -= 1;
                                        that.scroll_buffer.splice(0, scrollBlock);
                                        continue;
                                    }
                                    that.el_sc = document.createElement('span');
                                    that.el_sc.innerHTML = that.scroll_buffer.slice(i * scrollBlock, i * scrollBlock + scrollBlock).join('');
                                    that.el_scroll.append(that.el_sc);
                                }
                                // truncate buffer
                                while (that.scroll_buffer.length >= that.bufferLength) {
                                    that.el_scroll[0].removeChild(that.el_scroll[0].firstChild);
                                    that.scroll_buffer.splice(0, scrollBlock);
                                }
                            }
                        }

                        // activate / deactivate scroll content on buffer changes
                        if (oldBuffer != that.terminal.buffer) {
                            if (that.terminal.buffer == that.terminal.normal_buffer)
                                that.el_scroll.css('display', 'inline');
                            else
                                that.el_scroll.css('display', 'none');
                        }
                    }
                    
                    // terminal output
                    that.el_buffer = replaceHtml(that.el_buffer, that.toString());
                    // title
                    that.setTitle.call(that.el, that.terminal.title);
                    // scroll down
                    that.container[0].scrollTop = that.container[0].scrollHeight;
                }
                if (old_string)
                    setTimeout(function(){that.read(that)(old_string);}, 10);
                else
                    $.post('/read/' + that.id, '', that.read(that));
            }
        };
        
        this.init();
    }

    // install global keyhandler
    if (window['_browserterminal_keyhandler'] == undefined)
        window['_browserterminal_keyhandler'] = new KeyHandler();

    $.fn.browserterminal = function(options) {
        var settings = $.extend({
            size: [80, 25],
            bufferLength: 10000,
            inputPolling: 20,
            resize: function(size, cb) {},
            readPipe: function(cb) {},
            writePipe: function(s) {},
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