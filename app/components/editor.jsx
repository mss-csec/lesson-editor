import React from 'react';
import CodeMirror from 'react-codemirror';

export default class Editor extends React.Component {
  constructor(props) {
    super(props);

    this.updateCode = this.updateCode.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    // Short-circuit if there is no need to change
    if (this.props.name === nextProps.name) return;

    let cm = this.refs.editor.getCodeMirror();

    // Save current state
    this.props.changeView(this.props.name, cm.getDoc());

    cm.swapDoc(nextProps.doc); // really wish we didn't have to

    setTimeout(() => { this.refs.editor.focus() }, 100);
  }

  componentWillUnmount() {
    let cm = this.refs.editor.getCodeMirror();

    this.props.changeView(this.props.name, cm.getDoc());
  }

  updateCode(newCode) {
    const cm = this.refs.editor.getCodeMirror(),
          value = cm.getValue();

    this.props.updateView(value);
  }

  render() {
    return <CodeMirror ref='editor'
      value={this.props.doc.getValue()}
      onChange={this.updateCode}
      options={{
        lineNumbers: true,
        lineWrapping: true,
        styleActiveLine: true
      }} />;
  }
}
