'use strict';

(function () {
  var $ = function $(ctx, sel) {
    return (!sel ? document : ctx).querySelector(sel || ctx);
  },
      $$ = function $$(ctx, sel) {
    return [].slice.call((!sel ? document : ctx).querySelectorAll(sel || ctx));
  };

  // https://stackoverflow.com/a/12034334/3472393
  var escapeHtml = function () {
    var entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    return function (string) {
      return String(string).replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
      });
    };
  }();

  // Global presets
  var globals = {
    mode: 'markdown',
    theme: 'default'
  };

  var emptyLine = /^\s*$/;
  var storageKey = 'EDITOR_LOCAL';

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
    linkify: true
  });
  md.core.ruler.disable(['abbr']);
  md.inline.ruler.disable(['ins', 'mark']);

  var adoc = Asciidoctor();

  // Functions

  var Messages = {
    el: $('#messages'),
    clear: function clear() {
      this.el.dataset.style = '';
      this.el.innerHTML = '';
    },

    get message() {
      return this.el.textContent;
    },
    set message(m) {
      this.el.textContent = m;
      this.el.insertAdjacentHTML('afterbegin', '<span id=\'messages-close\'></span>');
    },
    get messageHTML() {
      return this.el.innerHTML;
    },
    set messageHTML(m) {
      this.el.innerHTML = '<span id=\'messages-close\'></span>' + m;
    },
    get style() {
      return this.el.dataset.style;
    },
    set style(s) {
      this.el.dataset.style = s;
    }
  };

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
      // check char encoding
      var asciiRegex = /[^\x00-\x7F]/g;
      if (/[^\x00-\x7F]/.test(src)) {
        var strBuilder = [],
            regArr = void 0;
        while ((regArr = asciiRegex.exec(src)) !== null) {
          var _cm$posFromIndex = cm.posFromIndex(regArr.index),
              line = _cm$posFromIndex.line,
              ch = _cm$posFromIndex.ch;

          strBuilder.push('    "' + regArr[0] + '" at Line ' + (line + 1) + ' Ch ' + ch);
        }
        return reject('Invalid character sequence(s)\n' + strBuilder.join('\n'));
      }

      // Extract YAML
      if (src.slice(0, 3) === '---') {
        var splitSrc = src.split('\n'),
            yaml = [],
            metadata = {},
            _line = 1; // offset by 1 for ending delim
        for (; _line < splitSrc.length; _line++) {
          if (splitSrc[_line] === '---') {
            _line++;
            break;
          }
          yaml.push(splitSrc[_line]);
        }
        try {
          metadata = jsyaml.safeLoad(yaml.join('\n'));
          src = splitSrc.slice(_line).join('\n');
        } catch (e) {
          return reject('JSYaml: ' + e.message);
        }

        if (metadata && metadata.hasOwnProperty('title')) {
          src = (globals.mode === 'markdown' ? '#' : '=') + ' ' + metadata.title + '\n' + src;
        }
      }

      if (globals.mode === 'markdown') {
        setTimeout(function () {
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
        }, 0);
      } else if (globals.mode === 'asciidoc') {
        setTimeout(function () {
          var converted = adoc.convert(src, {
            attributes: {
              showTitle: true,
              stem: 'latexmath',
              'source-language': 'cpp',
              pp: '++',
              cpp: 'C++'
            }
          }),
              isDeprecated = false;

          // Code blocks
          converted = converted.replace(/\{%\s*highlight(\s+[a-zA-Z0-9]+)?(\s+[a-zA-Z0-9]+)?\s*%\}(?:\s*?\n)?([\s\S]*?)\{%\s*endhighlight\s*%\}/gm, function (_, lang, linenos, code) {
            lang = lang.trim();
            if (lang === 'linenos') {
              var _ref = [linenos, lang];
              lang = _ref[0];
              linenos = _ref[1];
            }
            isDeprecated = true;
            return '<pre><code class="language-' + lang + '">' + escapeHtml(code) + '</code></pre>';
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

          if (isDeprecated) {
            // set depr. notice
            var deprBuilder = [],
                codeRegex = /\{%\s*highlight.*%\}[\s\S]*?\{%\s*endhighlight\s*%\}/gm,
                rawSrc = cm.getValue(),
                codeArr = void 0;

            while ((codeArr = codeRegex.exec(rawSrc)) !== null) {
              var _cm$posFromIndex2 = cm.posFromIndex(codeArr.index),
                  _line2 = _cm$posFromIndex2.line,
                  _ch = _cm$posFromIndex2.ch;

              deprBuilder.push('    Deprecated highlight syntax at Line ' + _line2 + ' Ch ' + _ch);
            }

            Messages.style = 'warning';
            Messages.message = deprBuilder.join('\n');
          }

          resolve(converted);
        }, 0);
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
    Messages.clear();

    convert(cm.getValue()).then(function (rendered) {
      preview.innerHTML = rendered;

      // highlight blocks
      $$(preview, 'pre code[class|="language"]').forEach(function (block) {
        hljs.highlightBlock(block);
      });
      $$(preview, 'pre.highlight code').forEach(function (block) {
        hljs.highlightBlock(block);
      });
    }, function (errMsg) {
      Messages.style = 'error';
      Messages.message = errMsg;
    });

    localStorage.setItem(storageKey, JSON.stringify({ mode: globals.mode, value: cm.getValue() }));
  };

  // Action buttons
  var actionDelims = {
    bold: { markdown: ['**', '**'], asciidoc: ['**', '**'] },
    italic: { markdown: ['_', '_'], asciidoc: ['__', '__'] },
    strike: { markdown: ['~~', '~~'], asciidoc: ['[line-through]##', '##'] },
    u_list: { markdown: ['- ', ''], asciidoc: ['* ', ''] },
    o_list: { markdown: ['{0}. ', ''], asciidoc: ['. ', ''] },
    code: { markdown: ['`', '`', 'block', '```{0}', '```'], asciidoc: ['``', '``', 'block', '[source,{0}]\n----', '----'] },
    quote: { markdown: ['> ', ''], asciidoc: ['block', '[quote, <author>]\n____', '____'] },
    heading: { markdown: ['#{0} ', ''], asciidoc: ['={0} ', ''] },
    'heading+1': { markdown: ['#{0} ', ''], asciidoc: ['={0} ', ''] },
    math: { markdown: ['$$', '$$', 'block', '$$', '$$'], asciidoc: ['stem:[', ']', 'block', '[stem]\n++++', '++++'] },
    link: { markdown: ['[', '](<link URL>)'], asciidoc: ['link:++<link URL>++[', ']'] },
    image: { markdown: ['![', '](<image URL>)'], asciidoc: ['image:++<image URL>++[', ']'] },
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
          if (content.slice(0, blockDelim[0].length) === blockDelim[0] && content.slice(-blockDelim[1].length === blockDelim[1] || content.slice(-blockDelim[1].length - 1) === blockDelim[1] + '\n')) {
            return content.slice(blockDelim[0].length + 1, -blockDelim[1].length - (content.slice(-1) === '\n' ? 2 : 1));
          }

          splitLines.unshift(blockDelim[0]);
          splitLines.push(blockDelim[1] + '\n');
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

    var selections = cm.getSelections(),
        ranges = cm.listSelections(),
        replacements = [],
        cursor = cm.getCursor(),
        cursorInd = 0;

    for (var i = 0; i < selections.length; i++) {
      replacements.push(replaceFcn(selections[i], ranges[i]));

      // if (selections[i].length > 0) {
      //   selections[i] = {
      //     anchor: {
      //       line: ranges[i].anchor
      //     }
      //   };
      // } else {
      //   let oCursor = {
      //     line: ranges[i].anchor.line + cursorOffset.line,
      //     ch: ranges[i].anchor.ch + cursorOffset.ch
      //   };
      //   selections[i] = { anchor: oCursor, head: oCursor };
      // }

      if (ranges[i].anchor.line <= cursor.line && cursor.line <= ranges[i].head.line || ranges[i].anchor.line >= cursor.line && cursor.line >= ranges[i].head.line) {
        cursorInd = i;
      }
    }

    cm.replaceSelections(replacements, 'around');
  };

  $('#actions').addEventListener('click', function (e) {
    if (e.target.hasAttribute('action')) {
      doAction(e.target.getAttribute('action'));
      cm.focus();
    }
  });

  $('#converter').addEventListener('change', function () {
    globals.mode = $('#converter').value;

    cmUpdate();

    render();
  });

  $('#import_lesson').addEventListener('click', function () {
    var url = window.prompt('Enter a URL to import a lesson from');

    if (url !== null) {
      if (/^(?:https?:\/\/)?github.com/.test(url)) {
        // Switch to githubusercontent.com
        url = url.replace(/^.+?\.com\/(.+)\/(.+)\/(?:raw|blob)\/(.+)$/i, "https://raw.githubusercontent.com/$1/$2/$3");
      }

      Messages.style = 'info';
      Messages.message = 'Loading lesson from ' + url + '...';

      fetch(url).then(function (resp) {
        if (resp.ok) {
          return resp.text();
        } else {
          throw new Error(resp.status + ' ' + resp.statusText);
        }
      }).then(function (text) {
        switch (url.slice(url.lastIndexOf('.') + 1)) {
          case 'markdn':
          case 'md':
          case 'mdown':
            globals.mode = 'markdown';
            break;
          case 'adoc':
          case 'asc':
            globals.mode = 'asciidoc';
            break;
          default:
            globals.mode = url.slice(url.lastIndexOf('.') + 1);
        }

        cm.setValue(text);
        $('#converter').value = globals.mode;

        cmUpdate();

        render();
      }).catch(function (err) {
        Messages.style = 'error';
        Messages.message = 'Error fetching lesson: ' + err.message;
      });
    }
  });

  $('#export_link').addEventListener('click', function () {
    var value = encodeURIComponent(cm.getValue());

    Messages.style = 'info';
    Messages.messageHTML = 'Copy link:\n    <input onclick=\'this.setSelectionRange(0,this.value.length)\' type=\'text\' value=\'' + location.href + '#' + globals.mode + ':' + value + '\'>';
  });

  // Page init

  // Event listeners
  $('#messages').addEventListener('click', function (e) {
    if (e.target && e.target.id === 'messages-close') {
      Messages.clear();
    }
  });

  // Load prev content, if existant
  if (localStorage.getItem(storageKey)) {
    var store = JSON.parse(localStorage.getItem(storageKey));

    globals.mode = store.mode;
    cm.setValue(store.value);

    $('#converter').value = store.mode;
  }

  var convDelta = 200,
      convTimeout = null,
      convTimestamp = 0;

  var convListener = function convListener() {
    if (Date.now() - convTimestamp > convDelta) {
      clearTimeout(convTimeout);
      convTimestamp = Date.now();

      convTimeout = setTimeout(render, convDelta);
    }
  };

  cm.on('change', convListener);

  cmUpdate();

  render();

  // Load from hash, if existant
  if (location.hash.length > 1 && ~location.hash.indexOf(':')) {
    var hash = location.hash.slice(1).split(':'),
        mode = decodeURIComponent(hash[0]),
        content = decodeURIComponent(hash[1]),
        message = 'You\'ve clicked (or entered) a link that someone saved for this editor.\nContinuing will replace the text in the editor with the text contained in the link.\nAs well, there are security implications with continuing if your source is untrusted.\nIf you continue, you will have five seconds to undo the replacement before it is rendered.\nAre you sure you want to continue?';

    if (confirm(message)) {
      // give 5 seconds to undo changes
      var oldConvDelta = convDelta;
      convDelta = 5000;
      setTimeout(function () {
        convDelta = oldConvDelta;
      }, oldConvDelta);

      globals.mode = mode;
      cm.setValue(content);

      cmUpdate();
    }
  }
})();
//# sourceMappingURL=app.js.map
