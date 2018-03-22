import nanoid from 'nanoid';

import React from 'react';

import { beforeUnload, getTimestamp } from '@utils/utils';
import { WELCOME_DOC } from '@utils/consts';

import Editor from '@components/editor';
import Preview from '@components/preview';
import Sidebar from '@components/sidebar';
import TabBar from '@components/tabbar';

export default class MainView extends React.Component {
  constructor(props) {
    super(props);

    let state = {
      loadedDocs: [],
      docs: {},
      tabsList: [],
      curDoc: WELCOME_DOC.id,
      curSrc: '',
      sidebarOpen: true
    };

    const saved = JSON.parse(localStorage.getItem(props.curRepo) || "{}");

    state.loadedDocs = saved.loadedDocs || [ WELCOME_DOC ];

    for (const { id, name, src, temp } of (saved.docs || state.loadedDocs)) {
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

    beforeUnload.add(() => {
      this.saveToStorage(this.state);
    });
  }

  componentWillReceiveProps() {
    this.saveToStorage(this.state);
  }

  componentWillUnmount() {
    this.saveToStorage(this.state);
  }

  // Save the document state
  saveToStorage(state) {
    this.lastSaveTimestamp = getTimestamp();

    localStorage.setItem(this.props.curRepo, JSON.stringify({
      timestamp: getTimestamp(),
      loadedDocs: state.loadedDocs,
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
        this.state.curDoc !== WELCOME_DOC.id) {
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

    return <div className="flex-row MainView">
      <Sidebar docs={this.state.docs}
        curDoc={this.state.curDoc}
        open={this.state.sidebarOpen}
        deleteItem={this.deleteDoc}
        selectItem={this.changeCurDoc}
        renameItem={this.renameDoc}
        auth={this.props.auth}
        repos={this.props.repos}
        curRepo={this.props.curRepo}
        addRepo={this.props.addRepo}
        changeRepo={this.props.changeRepo}
         />
      <div className="flex-column">
        <div className="flex-row TabBar-wrapper">
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
        <div className="flex-row EditorPreview-wrapper">
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
