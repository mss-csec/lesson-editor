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

  // DOM elements
  var editor = $('#editor'),
      preview = $('#preview');

  // Library initialization
  var cm = CodeMirror.fromTextArea(editor, {
    lineNumbers: true,
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
    // Extract YAML
    if (src.slice(0, 3) === '---') {
      var splitSrc = src.split('\n').slice(1),
          yaml = [],
          metadata = {},
          lineNo = 2; // offset by 1 for ending delim
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = splitSrc[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var line = _step.value;

          if (line === '---') break;
          yaml.push(line);
          lineNo++;
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      try {
        metadata = jsyaml.safeLoad(yaml.join('\n'));
        src = src.split('\n').slice(lineNo).join('\n');
      } catch (e) {
        return '<pre style="color:#c00">' + e.message + '</pre>';
      }

      if (metadata && metadata.hasOwnProperty('title')) {
        src = (globals.mode === 'markdown' ? '#' : '=') + ' ' + metadata.title + '\n' + src;
      }
    }

    if (globals.mode === 'markdown') {
      return md.render(src);
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

      return converted;
    } else {
      return src;
    }
  };

  // Page init
  cm.on('change', function () {
    preview.innerHTML = convert(cm.getValue());
  });

  cm.setOption('mode', globals.mode);
  cm.setOption('theme', globals.theme);

  $('#converter').addEventListener('change', function () {
    globals.mode = $('#converter').value;
    preview.innerHTML = convert(cm.getValue());
  });
})();
//# sourceMappingURL=app.js.map
