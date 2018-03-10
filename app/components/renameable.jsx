import React from 'react';

export default class Renameable extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      active: false,
      value: this.props.value
    };

    this.toggle = this.toggle.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  toggle() {
    this.setState(prevState => ({ active: !prevState.active }));
  }

  onKeyDown(e) {
    if (e.keyCode == 13) {
      this.props.onChange(e.target.value);
      this.toggle();
    } else if (e.keyCode == 27) {
      this.setState({ value: e.target.value });
      this.toggle();
    }
  }

  render() {
    if (this.state.active) {
      return <input ref={it => it && (it.focus() || it.select()) }
        className="Renameable Renameable-input"
        type="text"
        onBlur={(e => {
          this.setState({ value: e.target.value });
          this.toggle();
        })}
        onClick={(e => { e.stopPropagation() })}
        onKeyDown={(e => { this.onKeyDown(e) })}
        defaultValue={this.state.value} />;
    } else {
      return <span className="Renameable Renameable-label"
        onDoubleClick={this.toggle}>{this.props.value}</span>;
    }
  }
}
