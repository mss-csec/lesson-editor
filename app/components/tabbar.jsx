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
      docs: props.docs,
      curDoc: props.curDoc
    };

    this.updateCurDoc = this.updateCurDoc.bind(this);
    this.closeDoc = this.closeDoc.bind(this);
    this.makeNewDoc = this.makeNewDoc.bind(this);
  }

  updateCurDoc(i, e) {
    this.setState({ curDoc: i });
    this.props.changeCurDoc(i);
  }

  closeDoc(i, e) {
    let { docs } = this.state;

    docs.splice(i, 1);

    this.setState({ docs });
    this.updateCurDoc(Object.keys(docs).slice(-1)[0]);
  }

  makeNewDoc(e) {
    let { docs } = this.state, name = prompt('Enter new name');

    if (!docs.filter(d => d == name).length && name) {
      docs.push(name);
      this.setState({ docs });
      this.props.makeNewDoc(name);
    } else {
      alert('bad name');
    }
  }

  render() {
    let children = [];

    for (let d of this.state.docs) {
      children.push(<Tab key={d}
        name={d}
        curDoc={this.state.curDoc}
        selectTab={this.updateCurDoc.bind(null, d)}
        closeTab={this.closeDoc.bind(null, d)} />);
    }

    return <ul className="TabBar">
      {children}
      <li className="TabBar-tab TabBar-add" onClick={this.makeNewDoc}>+</li>
    </ul>;
  }
}
