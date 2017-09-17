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
        resolve(md.render(src));
      } else if (globals.mode === 'asciidoc') {
        var converted = adoc.convert(src, { attributes: { showTitle: true, pp: '++', cpp: 'C++' } });
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

        resolve(converted);
      } else {
        resolve(src);
      }
    });
  };

  var cmUpdate = function cmUpdate() {
    cm.setOption('mode', globals.mode);
    cm.setOption('theme', globals.theme);
  },
      render = function render() {
    convert(cm.getValue()).then(function (rendered) {
      preview.innerHTML = rendered;
    }, function (errMsg) {
      preview.innerHTML = '<pre style="color:#c00">' + errMsg + '</pre>';
    });
  };

  // Page init
  var convTimeout = null,
      convTimestamp = 0;
  cm.on('change', function () {
    console.log('change');
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
