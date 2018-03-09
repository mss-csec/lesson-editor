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
    this.setState({ value: e.target.value });

    if (e.keyCode == 13) {
      this.props.onChange(e.target.value);
      this.toggle();
    } else if (e.keyCode == 27) {
      this.toggle();
    }
  }

  render() {
    if (this.state.active) {
      return <input type="text"
        onKeyDown={this.onKeyDown}
        defaultValue={this.state.value} />;
    } else {
      return <span onDoubleClick={this.toggle}>{this.props.value}</span>;
    }
  }
}
