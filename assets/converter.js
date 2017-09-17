'use strict';

importScripts('https://cdnjs.cloudflare.com/ajax/libs/remarkable/1.7.1/remarkable.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/asciidoctor.js/1.5.5-5/asciidoctor.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/js-yaml/3.10.0/js-yaml.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/highlight.min.js');

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

var adoc = Asciidoctor({ runtime: { platform: 'browser' } });

var convert = function convert(_ref) {
  var mode = _ref.mode,
      data = _ref.data;

  // Extract YAML
  if (data.slice(0, 3) === '---') {
    var splitData = data.split('\n'),
        yaml = [],
        metadata = {},
        line = 1; // offset by 1 for ending delim
    for (; line < splitData.length; line++) {
      if (splitData[line] === '---') {
        line++;
        break;
      }
      yaml.push(splitData[line]);
    }
    try {
      metadata = jsyaml.safeLoad(yaml.join('\n'));
      data = splitData.slice(line).join('\n');
    } catch (e) {
      return '<pre style="color:#c00">' + e.message + '</pre>';
    }

    if (metadata && metadata.hasOwnProperty('title')) {
      data = (mode === 'markdown' ? '#' : '=') + ' ' + metadata.title + '\n' + data;
    }
  }

  if (mode === 'markdown') {
    return md.render(data);
  } else if (mode === 'asciidoc') {
    var converted = adoc.convert(data, { attributes: { showTitle: true, pp: '++', cpp: 'C++' } });
    converted = converted.replace(/\{%\s*highlight(\s+[a-zA-Z0-9]+)?(\s+[a-zA-Z0-9]+)?\s*%\}((?:.|\s)*?)\{%\s*endhighlight\s*%\}/gm, function (_, lang, linenos, code) {
      lang = lang.trim();
      // linenos = linenos.trim();
      if (lang === 'linenos') {
        var _ref2 = [linenos, lang];
        lang = _ref2[0];
        linenos = _ref2[1];
      }
      return '<pre><code class="language-' + lang + '">' + hljs.highlight(lang, code).value + '</code></pre>';
    });

    return converted;
  } else {
    return data;
  }
};

onmessage = function onmessage(e) {
  postMessage(convert(e.data));
};
//# sourceMappingURL=converter.js.map
