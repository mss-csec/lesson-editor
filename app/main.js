import nanoid from 'nanoid';

import React from 'react';
import ReactDOM from 'react-dom';

import Editor from 'components/editor';
import Preview from 'components/preview';
import Sidebar from 'components/sidebar';
import TabBar from 'components/tabbar';

const welcomeDoc = {
  id: 'Welcome!',
  name: ['Welcome!'],
  src: `# Welcome to the MSS CSEC Lesson Editor!`,
  temp: true
};

function getTimestamp() {
  return (new Date()).getTime();
}

class MainApp extends React.Component {
  constructor(props) {
    super(props);

    let state = {
      docs: {},
      tabsList: [],
      curDoc: 'Welcome!',
      curSrc: '',
      sidebarOpen: true
    };

    const saved = JSON.parse(localStorage.getItem('store') || "{}");

    state.loadedDocs = saved.docs || [ welcomeDoc ];

    for (const { id, name, src, temp } of state.loadedDocs) {
      // asciidoc for now
      state.docs[id || nanoid()] = {
        name: name.join('/'),
        doc: CodeMirror.Doc(src, 'asciidoc'),
        temp
      };
    }

    state.tabsList = saved.tabsList || Object.keys(state.docs);

    state.curDoc = saved.curDoc || state.tabsList[state.tabsList.length - 1];
    state.curSrc = state.docs[state.curDoc].doc.getValue();

    this.state = state;
    this.lastSaveTimestamp = getTimestamp();
    this.lastSaveTimeout = null;

    // Updating and changing the current editor view
    this.updateView = this.updateView.bind(this);
    this.changeView = this.changeView.bind(this);

    // Updating the tabbar
    this.closeDoc = this.closeDoc.bind(this);
    this.changeCurDoc = this.changeCurDoc.bind(this);
    this.onDragTabEnd = this.onDragTabEnd.bind(this);

    // Document updating functions
    this.makeNewDoc = this.makeNewDoc.bind(this);
    this.renameDoc = this.renameDoc.bind(this);
    this.deleteDoc = this.deleteDoc.bind(this);

    this.toggleSidebar = this.toggleSidebar.bind(this);

    // Converters

    const md = new Remarkable('full', {
                html: true,
                linkify: true
              }),
          adoc = Asciidoctor();

    md.core.ruler.disable([ 'abbr' ]);
    md.inline.ruler.disable([ 'ins', 'mark' ])

    this.converters = {
      markdown(src) { return md.render(src) },
      asciidoc(src) { return adoc.convert(src, {
          attributes: {
            showTitle: true,
            stem: 'latexmath',
            'source-language': 'cpp',
            pp: '++',
            cpp: 'C++'
          }
        });
      }
    };

    window.addEventListener("beforeunload", () => {
      this.saveToStorage(this.state);
    }, false);
  }

  // Save the document state
  saveToStorage(state) {
    this.lastSaveTimestamp = getTimestamp();

    localStorage.setItem('store', JSON.stringify({
      timestamp: getTimestamp(),
      docs: Object.keys(state.docs).map(d => ({
        id: d,
        name: state.docs[d].name.split('/'),
        src: d === state.curDoc ? state.curSrc : state.docs[d].doc.getValue(),
        temp: state.docs[d].temp
      })),
      tabsList: state.tabsList,
      curDoc: state.curDoc,
      sidebarOpen: state.sidebarOpen
    }));
  }

  updateView(text) {
    if (this.state.docs[this.state.curDoc].temp &&
        this.state.curDoc !== welcomeDoc.id) {
      let docs = this.state.docs;
      docs[this.state.curDoc].name = text.split('\n')[0] || 'Untitled';
    }

    // save every 5 seconds
    if (getTimestamp() > this.lastSaveTimestamp + 5000) {
      this.saveToStorage({ ...this.state, curSrc: text });
    }

    // save two seconds after last change
    clearTimeout(this.lastSaveTimeout);
    this.lastSaveTimeout = setTimeout(() => {
      this.saveToStorage(this.state);
    }, 2000);

    this.setState({ curSrc: text });
  }

  changeView(name, doc) {
    let docs = this.state.docs;

    // Sometimes, the document isn't defined because it's been deleted
    // So we only update when it is defined
    if (docs[name]) {
      docs[name].doc = doc;
      this.setState({ docs });
    }

    // this.state might not be updated here, but who cares
    this.saveToStorage(this.state);
  }

  closeDoc(doc) {
    let { docs, tabsList } = this.state

    tabsList.splice(tabsList.indexOf(doc), 1);

    // if closeDoc is called from deleteDoc, then docs[doc] might not
    // exist, hence the check
    if (docs[doc] && docs[doc].temp) {
      delete docs[doc];
      this.setState({ docs });
    }

    if (tabsList.length && Object.keys(docs).length) {
      this.setState({ tabsList });
      this.changeCurDoc(tabsList[tabsList.length - 1]);
    } else {
      this.makeNewDoc();
    }
  }

  changeCurDoc(doc) {
    this.setState({
      curDoc: doc,
      curSrc: this.state.docs[doc].doc.getValue()
    });

    if (!~this.state.tabsList.indexOf(doc)) {
      let tabsList = this.state.tabsList;
      tabsList.push(doc);
      this.setState({ tabsList });
    }
  }

  onDragTabEnd({ oldIndex, newIndex }) {
    let tabsList = this.state.tabsList,
        item = tabsList.splice(oldIndex, 1)[0];

    tabsList.splice(newIndex, 0, item);

    this.setState({ tabsList });
  }

  // Creates a new document
  makeNewDoc(givenName) {
    let { docs, tabsList } = this.state,
        name = givenName || 'Untitled',
        id;


    if (!name) {
      // cancel
      return;
    } else if (givenName &&
        (id = Object.keys(docs).filter(d => docs[d].name == name)[0])) {
      // existing doc
    } else {
      // creating a new doc entirely
      id = nanoid();
      docs[id] = {
        name,
        doc: CodeMirror.Doc('', 'asciidoc'),
        temp: !givenName // if givenName is empty, then this is true
      };
    }

    tabsList.push(id);
    this.setState({ docs, tabsList });
    this.changeCurDoc(id);
  }

  // Rename a given document
  renameDoc(doc, newName) {
    let docs = this.state.docs;
    docs[doc].name = newName;
    docs[doc].temp = false; // rename is equivalent to save
    this.setState({ docs });
  }

  // Deletes a given document
  deleteDoc(doc) {
    let { docs, tabsList } = this.state;
    delete docs[doc];

    if (~tabsList.indexOf(doc)) {
      this.closeDoc(doc);
    }

    this.setState({ docs });
  }

  // Toggles sidebar
  toggleSidebar(e) {
    e.preventDefault();

    let sidebarOpen = !this.state.sidebarOpen;
    this.setState({ sidebarOpen });
  }

  convert(src) {
    return this.converters.asciidoc(src);
  }

  render() {
    const doc = this.state.docs[this.state.curDoc].doc;

    return <div className="flex-row">
      <Sidebar docs={this.state.docs}
        curDoc={this.state.curDoc}
        open={this.state.sidebarOpen}
        deleteItem={this.deleteDoc}
        selectItem={this.changeCurDoc}
        renameItem={this.renameDoc} />
      <div className="flex-column">
        <div className="flex-row">
          <a href="#"
            className="Sidebar-toggle"
            onClick={this.toggleSidebar}
            dangerouslySetInnerHTML={{
              __html: this.state.sidebarOpen ? "&laquo;" : "&raquo;"
            }}>
          </a>
          <TabBar docs={this.state.tabsList}
            docNames={this.state.docs}
            curDoc={this.state.curDoc}
            closeTab={this.closeDoc}
            selectTab={this.changeCurDoc}
            onDragTabEnd={this.onDragTabEnd}
            addTab={this.makeNewDoc}
            renameTab={this.renameDoc} />
        </div>
        <div className="flex-row">
          <div id='editor-area'>
            <Editor updateView={this.updateView}
              changeView={this.changeView}
              name={this.state.curDoc}
              doc={doc} />
          </div>
          <div id='handlebar'></div>
          <div id='preview-area'>
            <Preview html={{
              __html: this.convert(this.state.curSrc)
            }} />
          </div>
        </div>
      </div>
    </div>;
  }
}

ReactDOM.render(<MainApp />, document.querySelector('[react-app]'));

(() => {
  const $ = (ctx, sel) => (!sel ? document : ctx).querySelector(sel || ctx),
        $$ = (ctx, sel) => [].slice.call((!sel ? document : ctx).querySelectorAll(sel || ctx));

  // https://stackoverflow.com/a/12034334/3472393
  const escapeHtml = (() => {
    const entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    return (string) => String(string).replace(/[&<>"'`=\/]/g, (s) => entityMap[s]);
  })();

  // Global presets
  const globals = {
    mode: 'markdown',
    theme: 'default'
  };

  const emptyLine = /^\s*$/;
  const storageKey = 'EDITOR_LOCAL';

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
    linkify: true
  });
  md.core.ruler.disable([ 'abbr' ]);
  md.inline.ruler.disable([ 'ins', 'mark' ]);

  const adoc = Asciidoctor();

  // Functions

  let Messages = {
    el: $('#messages'),
    clear() {
      this.el.dataset.style = '';
      this.el.innerHTML = '';
    },
    get message() {
      return this.el.textContent;
    },
    set message(m) {
      this.el.textContent = m;
      this.el.insertAdjacentHTML('afterbegin',
        `<span id='messages-close'></span>`);
    },
    get messageHTML() {
      return this.el.innerHTML;
    },
    set messageHTML(m) {
      this.el.innerHTML = `<span id='messages-close'></span>` + m;
    },
    get style() {
      return this.el.dataset.style;
    },
    set style(s) {
      this.el.dataset.style = s;
    }
  };

  let strFmt = (str, ...args) => {
    return str.replace(/\{(\d+)\}/g, (_, i) => ((i|0) < args.length) ? args[i|0] : _);
  };

  let convert = (src) => new Promise((resolve, reject) => {
    // check char encoding
    let asciiRegex = /[^\x00-\x7F]/g;
    if (/[^\x00-\x7F]/.test(src)) {
      let strBuilder = [], regArr;
      while ((regArr = asciiRegex.exec(src)) !== null) {
        let { line, ch } = cm.posFromIndex(regArr.index);
        strBuilder.push(`    "${regArr[0]}" at Line ${line+1} Ch ${ch}`);
      }
      return reject('Invalid character sequence(s)\n' + strBuilder.join('\n'));
    }

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
        return reject('JSYaml: ' + e.message);
      }

      if (metadata && metadata.hasOwnProperty('title')) {
        src = `${globals.mode === 'markdown' ? '#' : '='} ${metadata.title}\n` + src;
      }
    }

    if (globals.mode === 'markdown') {
      setTimeout(() => {
        // Replace LaTeX tags
        src = src.replace(
          /([^$\n]*\n)?\$\$([^$]+?)\$\$([^$\n]*\n)?/gm,
          (_, pre, code, post) => {
            if (pre !== undefined && pre.length && emptyLine.test(pre) &&
              post !== undefined && post.length && emptyLine.test(post)) {
              // display
              return pre +
                katex.renderToString(code, { displayMode: true, throwOnError: false }) +
                post;
            } else {
              // inline
              return (pre || '') +
                katex.renderToString(code, { throwOnError: false }) +
                (post || '');
            }
          }
        );

        resolve(md.render(src));
      }, 0);
    } else if (globals.mode === 'asciidoc') {
      setTimeout(() => {
        let converted = adoc.convert(src, {
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
        converted = converted.replace(
          /\{%\s*highlight(\s+[a-zA-Z0-9]+)?(\s+[a-zA-Z0-9]+)?\s*%\}(?:\s*?\n)?([\s\S]*?)\{%\s*endhighlight\s*%\}/gm,
          (_, lang, linenos, code) => {
            lang = lang.trim();
            if (lang === 'linenos') {
              [ lang, linenos ] = [ linenos, lang ];
            }
            isDeprecated = true;
            return `<pre><code class="language-${lang}">${escapeHtml(code)}</code></pre>`;
          }
        );

        // LaTeX
        converted = converted.replace(
          /\\(\(|\[)([\s\S]+?)\\(\)|\])/g,
          (_, open, code, close) => {
            if (open === '[' && close === ']') {
              // display
              return katex.renderToString(code, { displayMode: true, throwOnError: false});
            } else if (open === '(' && close === ')') {
              // inline
              return katex.renderToString(code, { throwOnError: false });
            } else {
              return _;
            }
          }
        );

        if (isDeprecated) {
          // set depr. notice
          let deprBuilder = [],
              codeRegex = /\{%\s*highlight.*%\}[\s\S]*?\{%\s*endhighlight\s*%\}/gm,
              rawSrc = cm.getValue(),
              codeArr;

          while ((codeArr = codeRegex.exec(rawSrc)) !== null) {
            let { line, ch } = cm.posFromIndex(codeArr.index);
            deprBuilder.push(`    Deprecated highlight syntax at Line ${line} Ch ${ch}`);
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

  let cmUpdate = () => {
    cm.setOption('mode', globals.mode);
    cm.setOption('theme', globals.theme);
  };

  let render = () => {
    Messages.clear();

    convert(cm.getValue()).then((rendered) => {
      preview.innerHTML = rendered;

      // highlight blocks
      $$(preview, 'pre code[class|="language"]').forEach((block) => {
        hljs.highlightBlock(block);
      });
      $$(preview, 'pre.highlight code').forEach((block) => {
        hljs.highlightBlock(block);
      });
    }, (errMsg) => {
      Messages.style = 'error';
      Messages.message = errMsg;
    });

    localStorage.setItem(storageKey,
      JSON.stringify({ mode: globals.mode, value: cm.getValue() }));
  };

  // Action buttons
  let actionDelims = {
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
          (emptyLine.test(cm.getLine(aLine - 1)) ||
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
          (content.slice(-blockDelim[1].length === blockDelim[1] ||
            content.slice(-blockDelim[1].length-1) === blockDelim[1] + '\n'))) {
          return content.slice(blockDelim[0].length+1,
            -blockDelim[1].length-(content.slice(-1) === '\n' ? 2 : 1));
        }

        splitLines.unshift(blockDelim[0]);
        splitLines.push(blockDelim[1] + '\n');
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

    let selections = cm.getSelections(),
        ranges = cm.listSelections(),
        replacements = [],
        cursor = cm.getCursor(),
        cursorInd = 0;

    for (let i=0; i<selections.length; i++) {
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

      if ((ranges[i].anchor.line <= cursor.line && cursor.line <= ranges[i].head.line) ||
        (ranges[i].anchor.line >= cursor.line && cursor.line >= ranges[i].head.line)) {
        cursorInd = i;
      }
    }

    cm.replaceSelections(replacements, 'around');
  }

  $('#actions').addEventListener('click', (e) => {
    if (e.target.hasAttribute('action')) {
      doAction(e.target.getAttribute('action'));
      cm.focus();
    }
  });

  $('#converter').addEventListener('change', () => {
    globals.mode = $('#converter').value;

    cmUpdate();

    render();
  });

  $('#import_lesson').addEventListener('click', () => {
    let url = window.prompt('Enter a URL to import a lesson from');

    if (url !== null) {
      if (/^(?:https?:\/\/)?github.com/.test(url)) {
        // Switch to githubusercontent.com
        url = url.replace(/^.+?\.com\/(.+)\/(.+)\/(?:raw|blob)\/(.+)$/i,
          "https://raw.githubusercontent.com/$1/$2/$3");
      }

      Messages.style = 'info';
      Messages.message = `Loading lesson from ${url}...`;

      fetch(url)
        .then((resp) => {
          if (resp.ok) {
            return resp.text();
          } else {
            throw new Error(`${resp.status} ${resp.statusText}`);
          }
        })
        .then((text) => {
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
        }).catch((err) => {
          Messages.style = 'error';
          Messages.message = `Error fetching lesson: ${err.message}`;
        });
    }
  });

  $('#export_link').addEventListener('click', () => {
    let value = encodeURIComponent(cm.getValue());

    Messages.style = 'info';
    Messages.messageHTML = `Copy link:
    <input onclick='this.setSelectionRange(0,this.value.length)' type='text' value='${location.href}#${globals.mode}:${value}'>`;
  });

  // Page init

  // Event listeners
  $('#messages').addEventListener('click', (e) => {
    if (e.target && e.target.id === 'messages-close') {
      Messages.clear();
    }
  });

  // Load prev content, if existant
  if (localStorage.getItem(storageKey)) {
    let store = JSON.parse(localStorage.getItem(storageKey));

    globals.mode = store.mode;
    cm.setValue(store.value);

    $('#converter').value = store.mode;
  }

  let convDelta = 200,
      convTimeout = null,
      convTimestamp = 0;

  let convListener = () => {
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
    let hash = location.hash.slice(1).split(':'),
        mode = decodeURIComponent(hash[0]),
        content = decodeURIComponent(hash[1]),
        message = `You've clicked (or entered) a link that someone saved for this editor.
Continuing will replace the text in the editor with the text contained in the link.
As well, there are security implications with continuing if your source is untrusted.
If you continue, you will have five seconds to undo the replacement before it is rendered.
Are you sure you want to continue?`;

    if (confirm(message)) {
      // give 5 seconds to undo changes
      let oldConvDelta = convDelta;
      convDelta = 5000;
      setTimeout(() => { convDelta = oldConvDelta }, oldConvDelta);

      globals.mode = mode;
      cm.setValue(content);

      cmUpdate();
    }
  }
})();
