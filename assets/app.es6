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

  // Functions
  let strFmt = (str, ...args) => {
    return str.replace(/\{(\d+)\}/g, (_, i) => ((i|0) < args.length) ? args[i|0] : _);
  };

  let convert = (src) => new Promise((resolve, reject) => {
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
        reject('JSYaml: ' + e.message);
      }

      if (metadata && metadata.hasOwnProperty('title')) {
        src = `${globals.mode === 'markdown' ? '#' : '='} ${metadata.title}\n` + src;
      }
    }

    if (globals.mode === 'markdown') {
      resolve(md.render(src));
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

      resolve(converted);
    } else {
      resolve(src);
    }
  });

  let cmUpdate = () => {
    cm.setOption('mode', globals.mode);
    cm.setOption('theme', globals.theme);
  };

  let render = () => {
    convert(cm.getValue()).then((rendered) => {
      preview.innerHTML = rendered;
    }, (errMsg) => {
      preview.innerHTML = `<pre style="color:#c00">${errMsg}</pre>`;
    });
  };

  // Action buttons
  let actionDelims = {
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
    ftnote: { markdown: ['[^{0}]\n\n[^{0}]: ', ''], asciidoc: ['footnote:[', ']'] },
  };

  let doAction = (action) => {
    let actionDelim = actionDelims[action][globals.mode],
        lineDelim = actionDelim,
        blockDelim = null,
        cursorOffset = { line: 0, ch: 0 };

    if (actionDelim.indexOf('block') > -1) {
      let ind = actionDelim.indexOf('block');
      lineDelim = actionDelim.slice(0, ind);
      blockDelim = actionDelim.slice(ind + 1);
    }

    let replaceFcn = (content, { anchor, head }) => {
      let splitLines = content.split('\n'),
          mode;

      if (!blockDelim && lineDelim.length === 2) {
        mode = 'line';
      } else if (lineDelim.length === 0) {
        mode = 'block';
      } else {
        // Determine whether to insert block or line delim
        // If whole line(s) selected, block
        // Otherwise, line
        let { line: aLine, ch: aCh } = anchor,
            { line: hLine, ch: hCh } = head;

        // Normalize so that anchor is always before head
        if (aLine > hLine || (aLine === hLine && aCh > hCh)) {
          [ aLine, hLine ] = [ hLine, aLine ];
          [ aCh, hCh ] = [ hCh, aCh ];
        }

        if (aCh === 0 &&
          (/^\s*$/.test(cm.getLine(aLine - 1)) ||
            (aLine < hLine && hCh === 0) ||
            (hCh !== 0 && hCh === cm.getLine(hLine).length))) {
          // block
          mode = 'block';
        } else {
          // line
          mode = 'line'
        }
      }

      switch (mode) {
      case 'block':
        // Undo action if already applied
        if (content.slice(0, blockDelim[0].length) === blockDelim[0] &&
          content.slice(-blockDelim[1].length) === blockDelim[1]) {
          return content.slice(blockDelim[0].length+1, -blockDelim[1].length-1);
        }

        splitLines.unshift(blockDelim[0]);
        splitLines.push(blockDelim[1]);
        cursorOffset = {
          line: blockDelim[0].split('\n').length,
          ch: blockDelim[0].split('\n').slice(-1)[0].length
        };
        break;
      case 'line':
        let i = 0;
        splitLines = splitLines.map((l) => {
          // Undo action if already applied
          if (l.slice(0, lineDelim[0].length) === lineDelim[0] &&
            (lineDelim[1] === '' ||
              l.slice(-lineDelim[1].length) === lineDelim[1])) {
            return l.slice(lineDelim[0].length,
              lineDelim[1] !== '' ? -lineDelim[1].length : Infinity);
          }

          if (splitLines.length > 1 && /^\s*$/.test(l)) {
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
      let selections = cm.getSelections(),
          ranges = cm.listSelections(),
          replacements = [];

      for (let i=0; i<selections.length; i++) {
        replacements.push(replaceFcn(selections[i], ranges[i]));
      }

      cm.replaceSelections(replacements, 'around');
    } else {
      let cursor = cm.getCursor();
      cm.replaceRange(replaceFcn('', { anchor: cursor, head: cursor }), cursor);
      cm.setCursor({ line: cursor.line + cursorOffset.line, ch: cursor.ch + cursorOffset.ch});
    }
  }

  $('#actions').addEventListener('click', (e) => {
    if (e.target.hasAttribute('action')) {
      doAction(e.target.getAttribute('action'));
      cm.focus();
    }
  });

  // Page init
  let convTimeout = null,
      convTimestamp = 0;

  cm.on('change', () => {
    if (Date.now() - convTimestamp > convDelta) {
      clearTimeout(convTimeout);
      convTimestamp = Date.now();

      convTimeout = setTimeout(render, convDelta);
    }
  });

  cmUpdate();

  $('#converter').addEventListener('change', () => {
    globals.mode = $('#converter').value;

    cmUpdate();

    render();
  });
})();
