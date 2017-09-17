(() => {
  const $ = (ctx, sel) => (!sel ? document : ctx).querySelector(sel || ctx),
        $$ = (ctx, sel) => [].slice.call((!sel ? document : ctx).querySelectorAll(sel || ctx));

  // Global presets
  const globals = {
    mode: 'markdown',
    theme: 'default'
  };

  // DOM elements
  const editor = $('#editor'),
        preview = $('#preview');

  // Library initialization
  const cm = CodeMirror.fromTextArea(editor, {
    lineNumbers: true,
    styleActiveLine: true
  });

  const md = new Remarkable('full', {
    html: true,
    linkify: true,
    highlight: (str, lang) => {
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
  md.core.ruler.disable([ 'abbr' ]);
  md.inline.ruler.disable([ 'ins', 'mark' ]);

  const adoc = Asciidoctor();

  // Functions
  let convert = (src) => {
    // Extract YAML
    if (src.slice(0,3) === '---') {
      let splitSrc = src.split('\n').slice(1),
          yaml = [],
          metadata = {},
          lineNo = 2; // offset by 1 for ending delim
      for (let line of splitSrc) {
        if (line === '---') break;
        yaml.push(line);
        lineNo++;
      }
      try {
        metadata = jsyaml.safeLoad(yaml.join('\n'));
        src = src.split('\n').slice(lineNo).join('\n');
      } catch (e) {
        return `<pre style="color:#c00">${e.message}</pre>`;
      }

      if (metadata && metadata.hasOwnProperty('title')) {
        src = `${globals.mode === 'markdown' ? '#' : '='} ${metadata.title}\n` + src;
      }
    }

    if (globals.mode === 'markdown') {
      return md.render(src);
    } else if (globals.mode === 'asciidoc') {
      let converted = adoc.convert(src, { attributes: { showTitle: true, pp: '++', cpp: 'C++' } });
      converted = converted.replace(
        /\{%\s*highlight(\s+[a-zA-Z0-9]+)?(\s+[a-zA-Z0-9]+)?\s*%\}((?:.|\s)*?)\{%\s*endhighlight\s*%\}/gm,
        (_, lang, linenos, code) => {
          lang = lang.trim();
          // linenos = linenos.trim();
          if (lang === 'linenos') {
            [ lang, linenos ] = [ linenos, lang ];
          }
          return `<pre><code class="language-${lang}">${hljs.highlight(lang, code).value}</code></pre>`;
        }
      );

      return converted;
    } else {
      return src;
    }
  };

  // Page init
  cm.on('change', () => {
    preview.innerHTML = convert(cm.getValue());
  });

  cm.setOption('mode', globals.mode);
  cm.setOption('theme', globals.theme);

  $('#converter').addEventListener('change', () => {
    globals.mode = $('#converter').value;
    preview.innerHTML = convert(cm.getValue());
  });
})();
