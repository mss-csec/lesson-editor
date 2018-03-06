import React from 'react';
import CodeMirror from 'react-codemirror';

export default class Editor extends React.Component {
  constructor(props) {
    super(props);

    this.updateCode = this.updateCode.bind(this);
  }

  componentDidMount() {
    let cm = this.refs.editor.getCodeMirror();

    if (Object.keys(this.props.history).length)
      cm.setHistory(this.props.history);
  }

  componentWillReceiveProps(nextProps) {
    // Short-circuit if there is no need to change
    if (this.props.name === nextProps.name) return;

    let cm = this.refs.editor.getCodeMirror();

    // Save current state
    this.props.changeState(this.props.name, cm.getValue(), cm.getHistory());

    if (Object.keys(nextProps.history).length) {
      cm.setHistory(nextProps.history);
    }
    cm.setValue(nextProps.src); // really wish we didn't have to
  }

  componentWillUnmount() {
    let cm = this.refs.editor.getCodeMirror();

    this.props.changeState(this.props.name, cm.getValue(), cm.getHistory());
  }

  updateCode(newCode) {
    const cm = this.refs.editor.getCodeMirror(),
          value = cm.getValue();

    this.props.updateState(value);
  }

  render() {
    return <CodeMirror ref='editor'
      value={this.props.src}
      onChange={this.updateCode}
      options={{
        lineNumbers: true,
        lineWrapping: true,
        styleActiveLine: true
      }} />;
  }
}
