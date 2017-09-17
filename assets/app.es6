(() => {
  const $ = (ctx, sel) => (!sel ? document : ctx).querySelector(sel || ctx),
        $$ = (ctx, sel) => [].slice.call((!sel ? document : ctx).querySelectorAll(sel || ctx));

  // Global presets
  const globals = {
    mode: 'markdown',
    theme: 'default'
  };

  const convDelta = 200;

  // DOM elements
  const editor = $('#editor'),
        preview = $('#preview');

  // Library initialization
  const cm = CodeMirror.fromTextArea(editor, {
    lineNumbers: true,
    lineWrapping: true,
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

  // Worker
  let converterWorker;

  if (window.Worker) {
    converterWorker = new Worker('./assets/converter.js');
    converterWorker.onmessage = (e) => {
      console.log(e.data);
      preview.innerHTML = e.data;
    };
  }

  // Functions
  let convert = (src) => {
    // Extract YAML
    if (src.slice(0,3) === '---') {
      let splitSrc = src.split('\n'),
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

  let cmUpdate = () => {
    cm.setOption('mode', globals.mode);
    cm.setOption('theme', globals.theme);
  }

  // Page init
  let convTimeout = null,
      convTimestamp = 0;
  cm.on('change', () => {
    if (Date.now() - convTimestamp > convDelta) {
      clearTimeout(convTimeout);
      convTimestamp = Date.now();

      if (converterWorker) {
        convTimeout = setTimeout(() => {
          converterWorker.postMessage({
            mode: globals.mode,
            data: cm.getValue()
          });
        }, convDelta);
      } else {
        convTimeout = setTimeout(() => {
          preview.innerHTML = convert(cm.getValue());
        }, convDelta);
      }
    }
  });

  cmUpdate();

  $('#converter').addEventListener('change', () => {
    globals.mode = $('#converter').value;

    cmUpdate();

    if (converterWorker) {
      converterWorker.postMessage({
        mode: globals.mode,
        data: cm.getValue()
      });
    } else {
      preview.innerHTML = convert(cm.getValue());
    }
  });
})();
