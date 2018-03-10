import React from 'react';
import Renameable from './renameable';
import CloseBtn from './closebtn';

function SidebarItem(props) {
  let classes = ['Sidebar-item'];

  if (props.curDoc == props.id) classes.push('Sidebar-item__selected');

  return <dd className={classes.join(' ')} onClick={props.selectItem}>
    <Renameable value={props.name}
      onChange={props.renameItem} />
      <CloseBtn onClick={props.deleteItem} />
  </dd>;
}

export default class Sidebar extends React.Component {
  constructor(props) {
    super(props);

    this.deleteItem = this.deleteItem.bind(this);
  }

  deleteItem(d, e) {
    e.stopPropagation();

    this.props.deleteItem(d);
  }

  render() {
    let docs = this.props.docs,
        children = [];

    for (let doc in docs) {
      if (!docs[doc].temp) {
        children.push(<SidebarItem key={doc}
          id={doc}
          name={docs[doc].name}
          curDoc={this.props.curDoc}
          deleteItem={this.deleteItem.bind(null, doc)}
          selectItem={this.props.selectItem.bind(null, doc)}
          renameItem={this.props.renameItem.bind(null, doc)} />);
      }
    }

    return <dl className="Sidebar">
      {children}
    </dl>
  }
}
