import React from 'react';
import CloseBtn from './closebtn';

function Tab(props) {
  let classes = ['TabBar-tab'];

  if (props.id == props.curDoc) classes.push('TabBar-tab__selected');

  return <li className={classes.join(' ')} onClick={props.selectTab}>
    {props.name}
    <CloseBtn onClick={props.closeTab} />
  </li>;
}

export default class TabBar extends React.Component {
  constructor(props) {
    super(props);

    this.closeDoc = this.closeDoc.bind(this);
  }

  closeDoc(d, e) {
    e.stopPropagation();

    this.props.closeDoc(d);
  }

  render() {
    let children = [];

    for (let d of this.props.docs) {
      children.push(<Tab key={d}
        id={d}
        name={this.props.docNames[d].name}
        curDoc={this.props.curDoc}
        selectTab={this.props.changeCurDoc.bind(null, d)}
        closeTab={this.closeDoc.bind(null, d)} />);
    }

    return <ul className="TabBar">
      {children}
      <li className="TabBar-tab TabBar-add" onClick={this.props.makeNewDoc}>+</li>
    </ul>;
  }
}
