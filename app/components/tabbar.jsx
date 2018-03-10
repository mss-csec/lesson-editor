import React from 'react';
import { SortableContainer, SortableElement } from 'react-sortable-hoc';

import Renameable from './renameable';
import CloseBtn from './closebtn';

// Base tab element
const Tab = SortableElement(props => {
  let classes = ['TabBar-tab'];

  if (props.id == props.curDoc) classes.push('TabBar-tab__selected');

  return <li className={classes.join(' ')} onClick={props.selectTab}>
    <Renameable value={props.name} onChange={props.renameDoc} />
    <CloseBtn onClick={props.closeTab} />
  </li>;
});

// Special element that deals with adding tabs
const AddTab = SortableElement(({ onClick }) =>
  <li className="TabBar-tab TabBar-add" onClick={onClick}>+</li>
);

// Scrollable tab container
const TabContainer = SortableContainer(({ children }) => {
  return <ul className="TabBar">
    {children}
  </ul>;
})

// The actual thing
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
    let children = this.props.docs.map(({ id, name }, index) => (
      <Tab key={id}
        index={index}
        id={id}
        name={name}
        curDoc={this.props.curDoc}
        renameDoc={this.props.renameDoc.bind(null, id)}
        selectTab={this.props.changeCurDoc.bind(null, id)}
        closeTab={this.closeDoc.bind(null, id)} />
    ));

    children.push(<AddTab key="add-tab"
      index={children.length}
      onClick={this.props.makeNewDoc}
      disabled={true} />);

    return <TabContainer
      axis="x"
      lockAxis="x"
      distance={10}
      onSortEnd={this.props.onDragTabEnd}>
      {children}
    </TabContainer>;
  }
}
