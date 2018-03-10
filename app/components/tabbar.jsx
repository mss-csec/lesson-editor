import React from 'react';
import { SortableContainer, SortableElement } from 'react-sortable-hoc';

import Renameable from './renameable';
import CloseBtn from './closebtn';

// Base tab element
const Tab = SortableElement(props => {
  let classes = ['TabBar-tab'];

  if (props.id == props.curDoc) classes.push('TabBar-tab__selected');
  if (props.isTemp) classes.push('TabBar-tab__temp');

  return <li className={classes.join(' ')} onClick={props.selectTab}>
    <Renameable value={props.name} onChange={props.renameTab} />
    <CloseBtn onClick={props.closeTab} />
  </li>;
});

// Special element that deals with adding tabs
const AddTab = SortableElement(({ onClick }) =>
  <li className="TabBar-tab TabBar-add" onClick={(e => { onClick() })}>+</li>
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

    this.closeTab = this.closeTab.bind(this);
  }

  closeTab(d, e) {
    e.stopPropagation();

    this.props.closeTab(d);
  }

  render() {
    let children = this.props.docs.map((id, index) => (
      <Tab key={id}
        index={index}
        id={id}
        name={this.props.docNames[id].name}
        isTemp={this.props.docNames[id].temp}
        curDoc={this.props.curDoc}
        renameTab={this.props.renameTab.bind(null, id)}
        selectTab={this.props.selectTab.bind(null, id)}
        closeTab={this.closeTab.bind(null, id)} />
    ));

    children.push(<AddTab key="add-tab"
      index={children.length}
      onClick={this.props.addTab}
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
