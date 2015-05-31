/**
 * jQuery.fn.browserterminal
 *
 */
(function($) {
    'use strict';
    
    function KeyHandler() {
        // see http://unixpapa.com/js/key.html
        
        // C0 control characters
        var CONTROL_CHARS = '@abcdefghijklmnopqrstuvwxyz[\\]^_';
        
        var KEYS = {
            'page up'   : ['\u001b[5~',  ['\u001b[5;', '~']],
            'page down' : ['\u001b[6~',  ['\u001b[6;', '~']],
            'end'       : ['',           ['\u001b[1;', 'F']],
            'home'      : ['',           ['\u001b[1;', 'H']],
            'left'      : ['',           ['\u001b[1;', 'D']],
            'up'        : ['',           ['\u001b[1;', 'A']],
            'right'     : ['',           ['\u001b[1;', 'C']],
            'down'      : ['',           ['\u001b[1;', 'B']],
            'insert'    : ['\u001b[2~',  ['\u001b[2;', '~']],
            'delete'    : ['\u001b[3~',  ['\u001b[3;', '~']],
            'F1'        : ['\u001bOP',   ['\u001b[1;', 'P']],
            'F2'        : ['\u001bOQ',   ['\u001b[1;', 'Q']],
            'F3'        : ['\u001bOR',   ['\u001b[1;', 'R']],
            'F4'        : ['\u001bOS',   ['\u001b[1;', 'S']],
            'F5'        : ['\u001b[15~', ['\u001b[15;', '~']],
            'F6'        : ['\u001b[17~', ['\u001b[17;', '~']],
            'F7'        : ['\u001b[18~', ['\u001b[18;', '~']],
            'F8'        : ['\u001b[19~', ['\u001b[19;', '~']],
            'F9'        : ['\u001b[20~', ['\u001b[20;', '~']],
            'F10'       : ['\u001b[21~', ['\u001b[21;', '~']],
            'F11'       : ['\u001b[23~', ['\u001b[23;', '~']],
            'F12'       : ['\u001b[24~', ['\u001b[24;', '~']]
        };
        
        function key(identifier, modifiers, normal, modified) {
            if (!normal)
                normal = KEYS[identifier][0];
            if (!modified)
                modified = KEYS[identifier][1];
            return (modifiers) ? modified.join(modifiers + 1) : normal;
        }
        
        
        var nonChar = false;  // closure flag to distinct non chars for keypress

        this.handle_keys = function(evt) {
            // handle only terminal elements
            var term = $(document.activeElement).data('terminal');
            if (!(term instanceof BrowserTerminal))
                return;
            //console.debug(evt.type, evt.keyCode, evt.charCode);
            var ret = true,
                char,
                idx;
            // get modifier key states
            var modifiers = evt.shiftKey << 0 | evt.altKey << 1 | evt.ctrlKey << 2 | evt.metaKey << 3;
            if (evt.type == 'keydown') {
                char = evt.keyCode;

                // SHIFT, CTRL, ALT
                if (char == 16 || char == 17 || char == 18) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    return false;
                }

                // chrome sees only keydown for CTRL+
                if (evt.ctrlKey) {
                    idx = CONTROL_CHARS.indexOf(String.fromCharCode(evt.keyCode).toLowerCase());
                    if (idx != -1) {
                        term.chars += String.fromCharCode(idx);
                        evt.stopPropagation();
                        evt.preventDefault();
                        return false;
                    }
                }

                // non chars on keydown
                if ((char && char < 16) ||          // non printables -- also exclude char 0
                    (char > 16 && char < 32) ||     // avoid shift
                    (char > 32 && char < 41) ||     // navigation keys
                    char == 46 || char == 45 ||     // delete and insert key
                    (evt.keyCode > 111 && evt.keyCode < 124))
                {
                    switch (char) {
                        case 8:  term.chars += '\u007f'; break;
                        case 9:  term.chars += '\t'; break;
                        case 10: term.chars += '\n'; break;
                        case 13: term.chars += '\r'; break;
                        case 27: term.chars += '\u001b'; break;
                        case 33: term.chars += key('page up', modifiers); break;
                        case 34: term.chars += key('page down', modifiers); break;
                        case 35: term.chars += key('end', modifiers, term.ckm('end')); break;
                        case 36: term.chars += key('home', modifiers, term.ckm('home')); break;
                        case 37: term.chars += key('left', modifiers, term.ckm('left')); break;
                        case 38: term.chars += key('up', modifiers, term.ckm('up')); break;
                        case 39: term.chars += key('right', modifiers, term.ckm('right')); break;
                        case 40: term.chars += key('down', modifiers, term.ckm('down'));  break;
                        case 45: term.chars += key('insert', modifiers); break;
                        case 46: term.chars += key('delete', modifiers); break;
                        case 112: term.chars += key('F1', modifiers); break;
                        case 113: term.chars += key('F2', modifiers); break;
                        case 114: term.chars += key('F3', modifiers); break;
                        case 115: term.chars += key('F4', modifiers); break;
                        case 116: term.chars += key('F5', modifiers); break;
                        case 117: term.chars += key('F6', modifiers); break;
                        case 118: term.chars += key('F7', modifiers); break;
                        case 119: term.chars += key('F8', modifiers); break;
                        case 120: term.chars += key('F9', modifiers); break;
                        case 121: term.chars += key('F10', modifiers); break;
                        case 122: term.chars += key('F11', modifiers); break;
                        case 123: term.chars += key('F12', modifiers); break;
                        default:
                            nonChar = false;
                            return true;
                    }
                    evt.stopPropagation();
                    evt.preventDefault();
                    nonChar = true;
                    return false;
                } else {
                    nonChar = false;
                }
            } else {                                // keypress
                if (nonChar)
                    return false;                   // non char handled on keydown
                // normal chars
                char = (evt.charCode) ? evt.charCode : evt.keyCode;
                if (char > 31) {
                    // control characters
                    if (evt.ctrlKey) {
                        idx = CONTROL_CHARS.indexOf(String.fromCharCode(char).toLowerCase());
                        if (idx != -1) {
                            term.chars += String.fromCharCode(idx);
                            evt.stopPropagation();
                            evt.preventDefault();
                            return;
                        }
                    }
                    
                    // FIXME - emacs Meta
                    if (evt.altKey)
                        term.chars += '\x1b';
                    term.chars += String.fromCharCode(char);
                    ret = false;
                }
            }
            return ret;
        };

        // from http://codebits.glennjones.net/editing/getclipboarddata.htm
        this.handle_paste = function(e) {
            // handle only terminal elements
            var term = $(document.activeElement).data('terminal');
            if (!(term instanceof BrowserTerminal))
                return;
            if (e.clipboardData) {
                term.chars += e.clipboardData.getData('text/plain');
            } else if (window.clipboardData) {  // IE
                term.chars += window.clipboardData.getData('Text');
            }
            e.stopPropagation();
            e.preventDefault();
        };

        // attach global handler to DOM
        document.onkeydown = this.handle_keys;
        document.onkeypress = this.handle_keys;
        document.onpaste = this.handle_paste;
    }

    var BITS = {
        1: 'bold',
        2: 'italic',
        4: 'underline',
        8: 'blink',
        16: 'inverse',
        32: 'conceal',
        64: 'c'
    };

    var MAP = function() {
        var m = [];
        for (var i=0; i<128; ++i) {
            var entry = [];
            for (var j in BITS) {
                if (i & j)
                    entry.push(BITS[j]);
            }
            m.push(entry.join(' '));
        }
        return m;
    }();
    
    // FIXME: cleanup this ugly mess
    function getStyles(num, gb) {
        var fg_rgb = num&67108864 && num&134217728;
        var bg_rgb = num&16777216 && num&33554432;
        // if (not RGB) and (fg set) and (bold set) and (fg < 8)
        var intense_on_bold = (!fg_rgb && num&67108864 && num&65536 && (num>>>8&255) < 8) ? 1 : 0;
        var inverse = num&1048576;
        var styles = [
            MAP[num>>>16 & 127]
            + ((num&67108864 && !fg_rgb) ? ((inverse)?' bg':' fg')+((intense_on_bold)?(num>>>8&255)|8:num>>>8&255) : '')
            + ((num&16777216 && !bg_rgb) ? ((inverse)?' fg':' bg')+(num&255) : '')
        ];
        // post check for default colors on inverse
        if (inverse && !(num&67108864))
            styles[0] += ' bg-1';
        if (inverse && !(num&16777216))
            styles[0] += ' fg-1';
        var s = '';
        if (fg_rgb)
            s += ((inverse)?'background-color:rgb(':'color:rgb(') + [num>>>8&255, gb>>>24, gb>>>8&255].join(',') + ');';
        if (bg_rgb)
            s += ((inverse)?'color:rgb(':'background-color:rgb(') + [num&255, gb>>>16&255, gb&255].join(',') + ');';
        styles.push(s);
        return styles;
    }

    /**
     * mouse protocols
     */
    function mouse_x10(button, x, y) {
        // NOTE: must be send binary!

        // CSI M CbCxCy (6 characters); all +32
        // Cb 0=MB1 pressed, 1=MB2 pressed, 2=MB3 pressed, 3=release
        // 4=Shift, 8=Meta, 16=Control
        // wheel action +64

        // only left button for now (0 --> 32 --> ' ')
        return '\u001b[M'
            + String.fromCharCode((button+32))
            + String.fromCharCode((x+1+32)%256)
            + String.fromCharCode((y+1+32)%256);
    }
    function mouse_utf8(button, x, y) {
        // basically identical to mouse_x10 but utf-8 encoded
        return mouse_x10(button, x, y);
    }
    function mouse_sgr(button, x, y, release) {
        return '\u001b[<'
            + button
            + ';'
            + (x + 1)
            + ';'
            + (y + 1)
            + ((release) ? 'm' : 'M');
    }
    function mouse_decimal() {
        // TODO
    }
    var MOUSETRACKING = {
        0: mouse_x10,
        1005: mouse_utf8,
        1006: mouse_sgr
        //1015: mouse_decimal
    };
    
    function BrowserTerminal(el, options) {
        this.that = this;
        this.el = $(el);
        this.el.html('<pre class="_tw" contenteditable="true" spellcheck="false"><span class="caret-hide">&#8203;</span><span class="scrollbuffer"></span><span class="buffer"></span></pre>');
        this.container = this.el.children('pre._tw');
        this.el_scroll = this.container.children('.scrollbuffer')[0];
        this.el_buffer = this.container.children('.buffer')[0];
        this.caret_hide = this.container.children('.caret-hide')[0];
        this.terminal = new AnsiTerminal(options.initialSize[0], options.initialSize[1]);
        this.parser = new AnsiParser(this.terminal);
        this.chars = '';
        this.scroll_buffer = [];
        this.bufferLength = options.bufferLength;
        this.inputPolling = options.inputPolling;
        this.scrollBufferChanged = false;
        this.resizeLock = false;
        this.resizable = options.resizable;

        // calculate fitting arrays [cols/rows] --> width/height
        // magic 1 for width is needed to avoid a useless horizontal scroll bar
        // FIXME: howto to trigger recalculation upon attr change?
        this.container.css('float', 'left');
        var el = $('<span>');
        this.container.append(el);
        this.fitWidth = [];
        var old_width = 0;
        for (var i = 1; i < 50; ++i) {
            el.html(new Array(i * 20 + 1).join('M'));
            var width = this.container.outerWidth();
            for (var j = 0; j < 20; j++) {
                this.fitWidth.push(Math.ceil((width - old_width) / 20 * j) + old_width + 1); // magic 1
            }
            old_width = width;
        }
        this.fitHeight = [];
        var old_height = 0;
        // magic 1
        this.container.width(this.container.outerWidth() + 1);
        for (i = 1; i < 30; ++i) {
            el.html(new Array(i * 10 + 1).join('M\n').slice(0, -1));
            var height = this.container.outerHeight();
            for (var j = 0; j < 10; j++) {
                this.fitHeight.push(Math.ceil((height - old_height) / 10 * j) + old_height);
            }
            old_height = height;
        }
        el.remove();
        this.container.css('float', '');
        
        if (this.resizable) {
            this.el.resize(function(){
                $(this).data('terminal').resize();
            });
        }
        if (this.resizable && options.resizableIndicator)
            this.el.css({resize: 'both', overflow: 'hidden'});

        
        // hide caret on focus and click
        //this.container.on('focus click', (function(that) {
        //    return function(ev){
        //        window.getSelection().collapse(that.caret_hide.firstChild, 0);
        //        ev.preventDefault();
        //    }
        //})(this));
        //this.container.on('click', (function(that) {
        //    return function(ev){
        //        console.log(ev.target, window.getSelection());
        //        console.log(ev);
        //    }
        //})(this));
        this.mousehandler = function(that, mode, protocol) {
            // TODO: position calculation is wrong!!!
            // wot to do with middle (insert?) and right button?
            return function(ev) {
                var x = ev.pageX;
                var y = ev.pageY;
                var col = 0;
                var row = 0;
                var button = ev.button;

                var i;
                for (i=0; i < that.fitWidth.length; ++i) {
                    if (that.fitWidth[i] >= x) {
                        col = i;
                        break;
                    }
                }
                for (i=0; i < that.fitHeight.length; ++i) {
                    if (that.fitHeight[i] >= y) {
                        row = i-1;
                        break;
                    }
                }

                // sgr mouse protocol handles button states different
                if (protocol == 1006) {
                    that.chars += mouse_sgr(button, col, row, (ev.type == 'mouseup'));
                    return;
                }

                if (ev.type == 'mouseup')
                    button = 3;
                if (ev.type == 'mousemove')
                    button += 32;

                if (!MOUSETRACKING[protocol]) {
                    console.log('mouse tracking: unsupported protocol', protocol);
                    return;
                }

                // x10 protocol is binary data - needs special transport encoding
                if (!protocol) {
                    // FIXME: serialize leftover data and mouse status requests
                    // send leftover input
                    if (that.chars) {
                        $.post('/write/' + that.id,
                            JSON.stringify({c: that.chars, e: 'utf-8'})
                        );
                        that.chars = '';
                    }
                    // send mouse status
                    $.post('/write/' + that.id,
                        JSON.stringify({c: btoa(mouse_x10(button, col, row)), e: 'base64'})
                    );
                    return;
                }

                // all other protocols go with normal delivery in utf-8
                that.chars += MOUSETRACKING[protocol](button, col, row);
            }
        };
        
        // beep
        this.beepElement = new Audio('/audio/beep.mp3');
        if (this.beepElement.canPlayType('audio/ogg').match(/maybe|probably/i))
            this.beepElement.src = '/audio/beep.ogg';
        this.beepElement.volume = 1;
        $('body').append(this.beepElement);
        
        // callbacks
        this.terminal.changedMouseHandling = (function(that){
            return function(mode, protocol) {
                that.container.off();
                switch (mode) {
                    case 0: return;
                    case 9:
                        // X10 mousedown only, wheel?
                        that.container.on('mousedown', that.mousehandler(that, mode, protocol));
                        break;
                    case 1000:
                        // mousedown, wheel?
                        // mouseup
                        that.container.on('mousedown', that.mousehandler(that, mode, protocol));
                        that.container.on('mouseup', that.mousehandler(that, mode, protocol));
                        break;
                    //case 1001:
                    //    // ?? not clear yet, wheel?
                    //    break;
                    case 1002:
                        // mousedown
                        // mousemove
                        // mouseup, wheel?
                        that.container.on('mousedown', that.mousehandler(that, mode, protocol));
                        that.container.on('mouseup', that.mousehandler(that, mode, protocol));
                        break;
                    case 1003:
                        // mousedown, wheel?
                        // mousemove
                        // mouseup
                        that.container.on('mousedown', that.mousehandler(that, mode, protocol));
                        that.container.on('mouseup', that.mousehandler(that, mode, protocol));
                        break;
                    default:
                        console.log('mouse tracking: unupported mode', mode);
                }
            }
        })(this);
        this.terminal.appendScrollBuffer = (function(that){
            return function(elems){
                if (that.bufferLength) {
                    that.scrollBufferChanged = true;
                    that.scroll_buffer.push([[elems], null]);
                    while (that.scroll_buffer.length >= that.bufferLength)
                        that.scroll_buffer.shift();
                }
            }
        })(this);
        this.terminal.clearScrollBuffer = (function(that){
            return function(){
                that.scroll_buffer = [];
                that.el_scroll.innerHTML = '';
            }
        })(this);
        this.terminal.fetchLastScrollBufferLine = (function(that){
            return function(){
                that.scrollBufferChanged = true;

                var last_entry = that.scroll_buffer.pop();
                if (last_entry)
                    return last_entry[0][0];
                return null;
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
            // remove cursor from buffer
            var tchar = this.terminal.buffer[this.terminal.cursor.row][this.terminal.cursor.col];
            if (this.terminal.show_cursor && tchar)
                        tchar.attr &= ~4194304;
            // apply all changes to terminal
            this.parser.parse(s);
            // set new cursor to buffer
            tchar = this.terminal.buffer[this.terminal.cursor.row][this.terminal.cursor.col];
            if (this.terminal.show_cursor && tchar)
                    tchar.attr |= 4194304;
        };

        this.ckm = function(s) {
            //var code = (this.terminal.cursor_key_mode) ? TERM_STRING['SS3'] : TERM_STRING['CSI'];
            var code = (this.terminal.cursor_key_mode) ? '\u001bO' : '\u001b[';
            switch (s) {
                case 'left'  : code +='D'; break;
                case 'up'    : code +='A'; break;
                case 'right' : code +='C'; break;
                case 'down'  : code +='B'; break;
                case 'end'   : code +='F'; break;
                case 'home'  : code +='H'; break;
            }
            return code;
        };
        
        // FIXME: simplify attr/gb checks
        this.createPrintFragment = function(buffer) {
            var frag = document.createDocumentFragment(),
                span = null,
                clas = null,
                s = '',
                old_attr = 0,
                attr = 0,
                old_gb = 0,
                gb = 0,
                styles;
            for (var i=0; i<buffer.length; ++i) {
                for (var j=0; j<buffer[i].length; ++j) {
                    attr = buffer[i][j].attr;
                    gb = buffer[i][j].gb;
                    if ((old_attr !== attr) || (old_gb !== gb)) {
                        if (old_attr || old_gb) {
                            span.textContent = s;
                            frag.appendChild(span);
                            s = '';
                        }
                        if (attr || gb) {
                            if (s) {
                                frag.appendChild(document.createTextNode(s));
                                s = '';
                            }
                            span = document.createElement('span');
                            styles = getStyles(attr, gb);
                            // classes
                            if (styles[0]) {
                                clas = document.createAttribute('class');
                                clas.value = styles[0];
                                span.setAttributeNode(clas);
                            }
                            // style
                            if (styles[1]) {
                                var style = document.createAttribute('style');
                                style.value = styles[1];
                                span.setAttributeNode(style);
                            }
                            // cursor
                            if (attr & 4194304) {
                                var data_contents = document.createAttribute('data-contents');
                                data_contents.value = buffer[i][j].c || '\xa0';
                                span.setAttributeNode(data_contents);
                                if (this.terminal.blinking_cursor)
                                    clas.value += ' blc';
                            }
                        }
                        old_attr = attr;
                        old_gb = gb;
                    }
                    s += buffer[i][j].c || '\xa0';
                }
                if (old_attr || old_gb) {
                    old_attr = 0;
                    old_gb = 0;
                    span.textContent = s;
                    frag.appendChild(span);
                    frag.appendChild(document.createTextNode('\n'));
                } else {
                    frag.appendChild(document.createTextNode(s + '\n'));
                }
                s = '';
            }
            return frag;
        };

        this.init = function() {
            $.post('/start', '', this.connect(this.that));
        };
        this.connect = function(that) {
            return function(s) {
                // set the internal id
                that.id = s;
                // init viewport size
                if (that.resizable) {
                    that.resize();
                } else {
                    that.container.width(that.fitWidth[that.terminal.cols]+'px');
                    that.container.height(that.fitHeight[that.terminal.rows]+'px');
                }
                // setup read and write connections
                setInterval(that.check_input(that), that.inputPolling);
                $.post('/read/' + that.id, '', that.read(that));
            }
        };
        this.check_input = function(that) {
            return function() {
                if (that.chars == '')
                    return;
                 // FIXME: utf-8 handing broken for illegal utf8 chars in MSR
                $.post('/write/' + that.id,  JSON.stringify({c: that.chars, e: 'utf-8'})); //btoa(that.chars));
                that.chars = '';
            }
        };
        this.read = function(that) {
            // FIXME: get rid of the recursion!!!
            return function(s) {
                var old_string = '';
                if (s) {
                    
                    // dont alter any terminal state while resizing is ongoing
                    if (that.resizeLock) {
                        setTimeout(function(){that.read(that)(s);}, 100);
                        return;
                    }

                    var oldBuffer = that.terminal.buffer;
                    
                    // try to keep responsive on fast big data
                    if (s.length > 32000)
                        old_string = s.slice(32000);
                    that.write(s.slice(0, 32000));

                    // scroll area
                    if (that.bufferLength && !old_string) {
                        if (that.terminal.buffer == that.terminal.normal_buffer) {
                            if (that.scrollBufferChanged) {
                                var new_el = that.el_scroll.cloneNode(false);
                                for (var i = 0; i<that.scroll_buffer.length; ++i) {
                                    new_el.appendChild(
                                        (that.scroll_buffer[i][1] ||
                                            (that.scroll_buffer[i][1]=that.createPrintFragment(that.scroll_buffer[i][0]))
                                        ).cloneNode(true));
                                }
                                that.el_scroll.parentNode.replaceChild(new_el, that.el_scroll);
                                that.el_scroll = new_el;
                                that.scrollBufferChanged = false;
                            }
                        }
                        // activate / deactivate scroll area on buffer changes
                        if (oldBuffer != that.terminal.buffer) {
                            if (that.terminal.buffer == that.terminal.normal_buffer)
                                that.el_scroll.style.display = 'inline';
                            else
                                that.el_scroll.style.display = 'none';
                        }
                    }
                    // terminal output
                    var new_buf = that.el_buffer.cloneNode(false);
                    new_buf.appendChild(that.createPrintFragment(that.terminal.buffer));
                    that.el_buffer.parentNode.replaceChild(new_buf, that.el_buffer);
                    that.el_buffer = new_buf;

                    // title
                    that.setTitle.call(that.el, that.terminal.title);
                    // scroll down - lazy to avoid early reflow
                    setTimeout(function() {
                        that.container[0].scrollTop = that.container[0].scrollHeight;
                    }, 0);
                }
                
                // continuation
                if (old_string)
                    setTimeout(function(){that.read(that)(old_string);}, 10);
                else
                    $.post('/read/' + that.id, '', that.read(that));
            }
        };
        
        this.resizeTerminal = function(cols, rows) {
            if ((this.id === undefined) || (cols < 2) || (rows < 2))
                return;
            this.resizeLock = true;
            $.post('/resize/' + this.id,
                JSON.stringify([cols, rows]),
                (function(that) {
                    return function(size) {
                        var old_cols = that.terminal.cols;
                        var old_rows = that.terminal.rows;
                        var new_cols = size.cols || 80;
                        var new_rows = size.rows || 25;
                        if (new_cols != old_cols || new_rows != old_rows) {

                            // remove cursor from buffer
                            var tchar = that.terminal.buffer[that.terminal.cursor.row][that.terminal.cursor.col];
                            if (that.terminal.show_cursor && tchar)
                                tchar.attr &= ~4194304;
                            
                            that.terminal.resize(new_cols, new_rows);

                            // set new cursor to buffer
                            tchar = that.terminal.buffer[that.terminal.cursor.row][that.terminal.cursor.col];
                            if (that.terminal.show_cursor && tchar)
                                tchar.attr |= 4194304;
                            
                            if (new_cols < old_cols) {
                                // shrink scrollbuffer
                                for (var i=0; i < that.scroll_buffer.length; ++i) {
                                    that.scroll_buffer[i][0][0] = that.scroll_buffer[i][0][0].slice(0, new_cols);
                                    that.scroll_buffer[i][1] = null;
                                }
                                that.scrollBufferChanged = true;
                            }
                            // adjust container height and width
                            that.container.width(that.fitWidth[new_cols]+'px');
                            that.container.height(that.fitHeight[new_rows]+'px');
                            
                            // redraw content - FIXME: ugly code, merge with read
                            // scroll area
                            if (that.bufferLength) {
                                if (that.terminal.buffer == that.terminal.normal_buffer) {
                                    if (that.scrollBufferChanged) {
                                        var new_el = that.el_scroll.cloneNode(false);
                                        for (var i=0; i<that.scroll_buffer.length; ++i) {
                                            new_el.appendChild(
                                                (that.scroll_buffer[i][1] ||
                                                    (that.scroll_buffer[i][1]=that.createPrintFragment(that.scroll_buffer[i][0]))
                                                ).cloneNode(true));
                                        }
                                        that.el_scroll.parentNode.replaceChild(new_el, that.el_scroll);
                                        that.el_scroll = new_el;
                                        that.scrollBufferChanged = false;
                                    }
                                }
                            }
                            // terminal output
                            var new_buf = that.el_buffer.cloneNode(false);
                            new_buf.appendChild(that.createPrintFragment(that.terminal.buffer));
                            that.el_buffer.parentNode.replaceChild(new_buf, that.el_buffer);
                            that.el_buffer = new_buf;

                            // title
                            that.setTitle.call(that.el, that.terminal.title);
                            // scroll down - lazy to avoid early reflow
                            setTimeout(function() {
                                that.container[0].scrollTop = that.container[0].scrollHeight;
                            }, 0);
                        }
                        that.resizeLock = false;
                    }
                })(this));
        };
        this.resize = function(width, height) {
            var cols = 0;
            var rows = 0;
            var i;
            width = width || this.el.outerWidth();
            height = height || this.el.outerHeight();
            for (i=0; i < this.fitWidth.length; ++i) {
                if (this.fitWidth[i] > width) {
                    cols = i-1;
                    break;
                }
            }
            for (i=0; i < this.fitHeight.length; ++i) {
                if (this.fitHeight[i] > height) {
                    rows = i-1;
                    break;
                }
            }
            this.resizeTerminal(cols, rows);
        };

        this.init();
    }

    // install global keyhandler
    if (window['_browserterminal_keyhandler'] == undefined)
        window['_browserterminal_keyhandler'] = new KeyHandler();

    $.fn.browserterminal = function(options) {
        var settings = $.extend({
            initialSize: [80, 25],
            bufferLength: 1000,
            inputPolling: 20,
            resizable: false,
            resizableIndicator: false
        }, options);

        return this.each(function() {
            var term = new BrowserTerminal(this, settings);
            $(this).data('terminal', term);
            $(this).children('._tw').data('terminal', term);
            return this;
        });
    };
}(jQuery));
