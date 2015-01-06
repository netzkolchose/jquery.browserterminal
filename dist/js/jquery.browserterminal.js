/**
 * jQuery.fn.browserterminal
 *
 */
(function($) {
    'use strict';

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
    
    function KeyHandler() {

        this.handle_keys = function(that) {
            return function(e) {
                // dont handle any other elements than terminals
                var term = $(document.activeElement).data('terminal');
                if (!(term instanceof BrowserTerminal))
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
            //if (!(term instanceof BrowserTerminal))
            //    return;
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
    
    function appendClone(node) {
        return function(el) {
            node.appendChild(el.cloneNode(true));
        }
    }
    
    function BrowserTerminal(el, options) {
        this.that = this;
        this.el = $(el);
        this.el.html('<pre class="_tw" contenteditable="true" spellcheck="false"><span class="caret-hide">&#8203;</span><span class="scrollbuffer"></span><span class="buffer"></span></pre>');
        this.container = this.el.children('pre._tw');
        this.el_scroll = this.container.children('.scrollbuffer')[0];
        this.el_buffer = this.container.children('.buffer')[0];
        this.caret_hide = this.container.children('.caret-hide')[0];
        this.terminal = new AnsiTerminal(options.size[0], options.size[1]);
        this.parser = new AnsiParser(this.terminal);
        this.chars = '';
        this.scroll_buffer = [];
        this.bufferLength = options.bufferLength;
        this.inputPolling = options.inputPolling;
        this.scrollBufferChanged = false;
        
        // set pre size from col x row
        var el_height = $('<span>');
        // bug in chrome? we need to disable scrollbar temporarily
        var scroll = this.container.css('overflow-y');
        this.container.css('overflow-y', 'hidden');
        // fill with M
        var filler = new Array(options.size[1]+1).join( (new Array(options.size[0]+1).join('M'))+'\n');
        el_height.html(filler.slice(0,-1));
        this.container.append(el_height);
        this.container.height(this.container.outerHeight()+'px');
        this.container.css('overflow-y', scroll);
        el_height.remove();
        
        // hide caret on focus and click
        this.container.on('focus click', (function(that) {
            return function(ev){
                window.getSelection().collapse(that.caret_hide.firstChild, 0);
                ev.preventDefault();
            }
        })(this));
        
        // beep
        this.beepElement = new Audio('/audio/beep.mp3');
        if (this.beepElement.canPlayType('audio/ogg').match(/maybe|probably/i))
            this.beepElement.src = '/audio/beep.ogg';
        this.beepElement.volume = 1;
        $('body').append(this.beepElement);
        
        // callbacks
        this.terminal.appendScrollBuffer = (function(that){
            return function(elems){
                if (that.bufferLength) {
                    that.scrollBufferChanged = true;
                    that.scroll_buffer.push(that.createPrintFragment([elems]));
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
        
        this.createPrintFragment = function(buffer) {
            var frag = document.createDocumentFragment(),
                span = null,
                clas = null,
                s = '',
                old_attr = null,
                attr = null;
            for (var i=0; i<buffer.length; ++i) {
                for (var j=0; j<buffer[i].length; ++j) {
                    attr = buffer[i][j].attributes;
                    if (old_attr !== attr) {
                        if (old_attr) {
                            span.textContent = s;
                            frag.appendChild(span);
                            s = '';
                        }
                        if (attr) {
                            if (s) {
                                frag.appendChild(document.createTextNode(s));
                                s = '';
                            }
                            span = document.createElement('span');
                            clas = document.createAttribute('class');
                            clas.value = attr.join('');
                            span.setAttributeNode(clas);
                            if (attr[3]) {
                                var data_contents = document.createAttribute('data-contents');
                                data_contents.value = buffer[i][j].c || '\xa0';
                                span.setAttributeNode(data_contents);
                            }
                        }
                        old_attr = attr;
                    }
                    s += buffer[i][j].c || '\xa0';
                }
                if (old_attr) {
                    old_attr = null;
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
                                that.scroll_buffer.map(appendClone(new_el));
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
                    // scroll down
                    that.container[0].scrollTop = that.container[0].scrollHeight;
                }
                
                // continuation
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
            bufferLength: 5000,
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
