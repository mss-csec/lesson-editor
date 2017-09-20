'use strict';

(function () {
  var $ = function $(ctx, sel) {
    return (!sel ? document : ctx).querySelector(sel || ctx);
  },
      $$ = function $$(ctx, sel) {
    return [].slice.call((!sel ? document : ctx).querySelectorAll(sel || ctx));
  };

  // Global presets
  var globals = {
    mode: 'markdown',
    theme: 'default'
  };

  var convDelta = 200;
  var emptyLine = /^\s*$/;

  // DOM elements
  var editor = $('#editor'),
      preview = $('#preview');

  // Library initialization
  var cm = CodeMirror.fromTextArea(editor, {
    lineNumbers: true,
    lineWrapping: true,
    styleActiveLine: true
  });

  var md = new Remarkable('full', {
    html: true,
    linkify: true,
    highlight: function highlight(str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(lang, str).value;
        } catch (err) {}
      }

      try {
        return hljs.highlightAuto(str).value;
      } catch (err) {}

      return ''; // use external default escaping
    }
  });
  md.core.ruler.disable(['abbr']);
  md.inline.ruler.disable(['ins', 'mark']);

  var adoc = Asciidoctor();

  // Functions
  var strFmt = function strFmt(str) {
    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    return str.replace(/\{(\d+)\}/g, function (_, i) {
      return (i | 0) < args.length ? args[i | 0] : _;
    });
  };

  var convert = function convert(src) {
    return new Promise(function (resolve, reject) {
      // Extract YAML
      if (src.slice(0, 3) === '---') {
        var splitSrc = src.split('\n'),
            yaml = [],
            metadata = {},
            line = 1; // offset by 1 for ending delim
        for (; line < splitSrc.length; line++) {
          if (splitSrc[line] === '---') {
            line++;
            break;
          }
          yaml.push(splitSrc[line]);
        }
        try {
          metadata = jsyaml.safeLoad(yaml.join('\n'));
          src = splitSrc.slice(line).join('\n');
        } catch (e) {
          reject('JSYaml: ' + e.message);
        }

        if (metadata && metadata.hasOwnProperty('title')) {
          src = (globals.mode === 'markdown' ? '#' : '=') + ' ' + metadata.title + '\n' + src;
        }
      }

      if (globals.mode === 'markdown') {
        // Replace LaTeX tags
        src = src.replace(/([^$\n]*\n)?\$\$([^$]+?)\$\$([^$\n]*\n)?/gm, function (_, pre, code, post) {
          if (pre !== undefined && pre.length && emptyLine.test(pre) && post !== undefined && post.length && emptyLine.test(post)) {
            // display
            return pre + katex.renderToString(code, { displayMode: true, throwOnError: false }) + post;
          } else {
            // inline
            return (pre || '') + katex.renderToString(code, { throwOnError: false }) + (post || '');
          }
        });

        resolve(md.render(src));
      } else if (globals.mode === 'asciidoc') {
        var converted = adoc.convert(src, { attributes: { showTitle: true, pp: '++', cpp: 'C++' } });

        // Code blocks
        converted = converted.replace(/\{%\s*highlight(\s+[a-zA-Z0-9]+)?(\s+[a-zA-Z0-9]+)?\s*%\}((?:.|\s)*?)\{%\s*endhighlight\s*%\}/gm, function (_, lang, linenos, code) {
          lang = lang.trim();
          // linenos = linenos.trim();
          if (lang === 'linenos') {
            var _ref = [linenos, lang];
            lang = _ref[0];
            linenos = _ref[1];
          }
          return '<pre><code class="language-' + lang + '">' + hljs.highlight(lang, code).value + '</code></pre>';
        });

        // LaTeX
        converted = converted.replace(/\\(\(|\[)([\s\S]+?)\\(\)|\])/g, function (_, open, code, close) {
          if (open === '[' && close === ']') {
            // display
            return katex.renderToString(code, { displayMode: true, throwOnError: false });
          } else if (open === '(' && close === ')') {
            // inline
            return katex.renderToString(code, { throwOnError: false });
          } else {
            return _;
          }
        });

        resolve(converted);
      } else {
        resolve(src);
      }
    });
  };

  var cmUpdate = function cmUpdate() {
    cm.setOption('mode', globals.mode);
    cm.setOption('theme', globals.theme);
  };

  var render = function render() {
    convert(cm.getValue()).then(function (rendered) {
      preview.innerHTML = rendered;
    }, function (errMsg) {
      preview.innerHTML = '<pre style="color:#c00">' + errMsg + '</pre>';
    });
  };

  // Action buttons
  var actionDelims = {
    bold: { markdown: ['**', '**'], asciidoc: ['**', '**'] },
    italic: { markdown: ['_', '_'], asciidoc: ['__', '__'] },
    strike: { markdown: ['~~', '~~'], asciidoc: ['[line-through]#', '#'] },
    u_list: { markdown: ['- ', ''], asciidoc: ['* ', ''] },
    o_list: { markdown: ['{0}. ', ''], asciidoc: ['. ', ''] },
    code: { markdown: ['`', '`', 'block', '```{0}', '```'], asciidoc: ['``', '``', 'block', '++++\n{% highlight {0} %}', '{% endhighlight %}\n++++'] },
    quote: { markdown: ['> ', ''], asciidoc: ['block', '[quote, <author>]\n____', '____'] },
    heading: { markdown: ['#{0} ', ''], asciidoc: ['={0} ', ''] },
    'heading+1': { markdown: ['#{0} ', ''], asciidoc: ['={0} ', ''] },
    math: { markdown: ['$$', '$$', 'block', '$$', '$$'], asciidoc: ['\\(', '\\)', 'block', '\\[', '\\]'] },
    link: { markdown: ['[', '](<link URL>)'], asciidoc: ['link:<link URL>[', ']'] },
    image: { markdown: ['![', '](<image URL>)'], asciidoc: ['image:<image URL>[', ']'] },
    ftnote: { markdown: ['[^{0}]\n\n[^{0}]: ', ''], asciidoc: ['footnote:[', ']'] }
  };

  var doAction = function doAction(action) {
    var actionDelim = actionDelims[action][globals.mode],
        lineDelim = actionDelim,
        blockDelim = null,
        cursorOffset = { line: 0, ch: 0 };

    if (actionDelim.indexOf('block') > -1) {
      var ind = actionDelim.indexOf('block');
      lineDelim = actionDelim.slice(0, ind);
      blockDelim = actionDelim.slice(ind + 1);
    }

    var replaceFcn = function replaceFcn(content, _ref2) {
      var anchor = _ref2.anchor,
          head = _ref2.head;

      var splitLines = content.split('\n'),
          mode = void 0;

      if (!blockDelim && lineDelim.length === 2) {
        mode = 'line';
      } else if (lineDelim.length === 0) {
        mode = 'block';
      } else {
        // Determine whether to insert block or line delim
        // If whole line(s) selected, block
        // Otherwise, line
        var aLine = anchor.line,
            aCh = anchor.ch,
            hLine = head.line,
            hCh = head.ch;

        // Normalize so that anchor is always before head

        if (aLine > hLine || aLine === hLine && aCh > hCh) {
          var _ref3 = [hLine, aLine];
          aLine = _ref3[0];
          hLine = _ref3[1];
          var _ref4 = [hCh, aCh];
          aCh = _ref4[0];
          hCh = _ref4[1];
        }

        if (aCh === 0 && (emptyLine.test(cm.getLine(aLine - 1)) || aLine < hLine && hCh === 0 || hCh !== 0 && hCh === cm.getLine(hLine).length)) {
          // block
          mode = 'block';
        } else {
          // line
          mode = 'line';
        }
      }

      switch (mode) {
        case 'block':
          // Undo action if already applied
          if (content.slice(0, blockDelim[0].length) === blockDelim[0] && content.slice(-blockDelim[1].length) === blockDelim[1]) {
            return content.slice(blockDelim[0].length + 1, -blockDelim[1].length - 1);
          }

          splitLines.unshift(blockDelim[0]);
          splitLines.push(blockDelim[1]);
          cursorOffset = {
            line: blockDelim[0].split('\n').length,
            ch: blockDelim[0].split('\n').slice(-1)[0].length
          };
          break;
        case 'line':
          var i = 0;
          splitLines = splitLines.map(function (l) {
            // Undo action if already applied
            if (l.slice(0, lineDelim[0].length) === lineDelim[0] && (lineDelim[1] === '' || l.slice(-lineDelim[1].length) === lineDelim[1])) {
              return l.slice(lineDelim[0].length, lineDelim[1] !== '' ? -lineDelim[1].length : Infinity);
            }

            if (splitLines.length > 1 && emptyLine.test(l)) {
              // case-by-case
              if (globals.mode === 'markdown' && action === 'quote') {
                return lineDelim[0] + l;
              }

              return l;
            }

            i++;

            // case-by-case
            if (globals.mode === 'markdown' && action === 'o_list') {
              return strFmt(lineDelim[0], i) + l;
            }

            return lineDelim[0] + l + lineDelim[1];
          });
          cursorOffset = {
            line: lineDelim[0].split('\n').length - 1,
            ch: lineDelim[0].split('\n').slice(-1)[0].length
          };
          break;
      }

      return splitLines.join('\n');
    };

    if (cm.somethingSelected()) {
      var selections = cm.getSelections(),
          ranges = cm.listSelections(),
          replacements = [];

      for (var i = 0; i < selections.length; i++) {
        replacements.push(replaceFcn(selections[i], ranges[i]));
      }

      cm.replaceSelections(replacements, 'around');
    } else {
      var cursor = cm.getCursor();
      cm.replaceRange(replaceFcn('', { anchor: cursor, head: cursor }), cursor);
      cm.setCursor({ line: cursor.line + cursorOffset.line, ch: cursor.ch + cursorOffset.ch });
    }
  };

  $('#actions').addEventListener('click', function (e) {
    if (e.target.hasAttribute('action')) {
      doAction(e.target.getAttribute('action'));
      cm.focus();
    }
  });

  // Page init
  var convTimeout = null,
      convTimestamp = 0;

  cm.on('change', function () {
    if (Date.now() - convTimestamp > convDelta) {
      clearTimeout(convTimeout);
      convTimestamp = Date.now();

      convTimeout = setTimeout(render, convDelta);
    }
  });

  cmUpdate();

  $('#converter').addEventListener('change', function () {
    globals.mode = $('#converter').value;

    cmUpdate();

    render();
  });
})();
//# sourceMappingURL=app.js.map
