import React from 'react';

function Tab(props) {
  return <li className={'TabBar-tab ' + props.className}>{props.name}</li>;
}

export default class TabBar extends React.Component {
  constructor(props) {
    super(props);

    this.onClick = this.onClick.bind(this);
  }

  onClick(e) {
    let { target } = e;
    console.log(e.target);
  }

  render() {
    return <ul className="TabBar" onClick={this.onClick}>
      {this.props.docs.map((d, i) => <Tab key={i}
        name={d.name}
        className={i == this.props.curDoc ? 'TabBar-tab__selected' : ''} />)}
      <li className="TabBar-add">+</li>
    </ul>;
  }
}
