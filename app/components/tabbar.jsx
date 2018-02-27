import React from 'react';

function Tab(props) {
  let classes = ['TabBar-tab'];

  if (props.num == props.curDoc) classes.push('TabBar-tab__selected');

  return <li className={classes.join(' ')}
    onClick={props.selectTab}>{props.name} <a onClick={props.closeTab}>&times;</a></li>;
}

export default class TabBar extends React.Component {
  constructor(props) {
    super(props);


    // tEMP
    this.state = { docs: props.docs, curDoc: props.curDoc };

    this.updateCurDoc = this.updateCurDoc.bind(this);
    this.closeDoc = this.closeDoc.bind(this);
    this.makeNewDoc = this.makeNewDoc.bind(this);
  }

  updateCurDoc(i, e) {
    this.setState({ curDoc: i });
  }

  closeDoc(i, e) {
    let { docs } = this.state;

    docs.splice(i, 1);

    this.setState({ docs });
    this.updateCurDoc(0);
  }

  makeNewDoc(e) {
    let { docs } = this.state;
    docs.push({ name: 'Whoaa' });
    this.setState({ docs });
    this.updateCurDoc(docs.length - 1);
  }

  render() {
    return <ul className="TabBar">
      {this.state.docs.map((d, i) => <Tab key={d.name}
        num={i}
        name={d.name}
        curDoc={this.state.curDoc} 
        selectTab={this.updateCurDoc.bind(null, i)}
        closeTab={this.closeDoc.bind(null, i)} />)}
      <li className="TabBar-add" onClick={this.makeNewDoc}>+</li>
    </ul>;
  }
}
