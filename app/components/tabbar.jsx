import React from 'react';
import CloseBtn from './closebtn';

function Tab(props) {
  let classes = ['TabBar-tab'];

  if (props.name == props.curDoc) classes.push('TabBar-tab__selected');

  return <li className={classes.join(' ')}
    onClick={props.selectTab}>{props.name} <CloseBtn onClick={props.closeTab} /></li>;
}

export default class TabBar extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      docs: props.docs
    };

    this.closeDoc = this.closeDoc.bind(this);
    this.makeNewDoc = this.makeNewDoc.bind(this);
  }

  closeDoc(d, e) {
    let { docs } = this.state;

    e.stopPropagation();

    docs.splice(docs.indexOf(d), 1);

    this.setState({ docs });
    this.props.changeCurDoc(docs.slice(-1)[0]);
  }

  makeNewDoc(e) {
    let { docs } = this.state, name = prompt('Enter new name');

    if (!name) {
      // cancel
      return;
    } else if (~this.props.docs.indexOf(name)) {
      // switching to a prevosly existing doc
      docs.push(name);
      this.setState({ docs });
      this.props.changeCurDoc(name);
    } else if (!~docs.indexOf(name)) {
      // creating a new doc entirely
      docs.push(name);
      this.setState({ docs });
      this.props.makeNewDoc(name);
    }
  }

  render() {
    let children = [];

    for (let d of this.state.docs) {
      children.push(<Tab key={d}
        name={d}
        curDoc={this.props.curDoc}
        selectTab={this.props.changeCurDoc.bind(null, d)}
        closeTab={this.closeDoc.bind(null, d)} />);
    }

    return <ul className="TabBar">
      {children}
      <li className="TabBar-tab TabBar-add" onClick={this.makeNewDoc}>+</li>
    </ul>;
  }
}
