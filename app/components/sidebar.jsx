import React from 'react';

import Renameable from '@components/renameable';
import CloseBtn from '@components/closebtn';
import RepoSelect from '@components/reposelect';

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
        classes = [
          "Sidebar",
          `Sidebar__${this.props.open ? "open" : "closed"}`,
          "flex-column"
        ],
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

    if (!children.length) classes.push("Sidebar__empty");

    return <div className={classes.join(' ')}>
      <RepoSelect auth={this.props.auth}
        repos={this.props.repos}
        curRepo={this.props.curRepo}
        addRepo={this.props.addRepo}
        changeRepo={this.props.changeRepo} />
      <dl className="flex-column Sidebar-container">
        {children.length ? (
          children
        ) : (
          <h1 className="Sidebar__empty-heading">No docs to show</h1>
        )}
      </dl>
    </div>
  }
}
