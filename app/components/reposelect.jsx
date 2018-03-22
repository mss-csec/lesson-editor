import React from 'react';
import ReactModal from 'react-modal';
import ReactDropdown from 'react-dropdown';

export default class RepoSelect extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showCreateModal: false
    }

    this.closeCreateModal = this.closeCreateModal.bind(this);
    this.onChange = this.onChange.bind(this);
  }

  closeCreateModal() {
    this.setState({ showCreateModal: false });
  }

  onChange(value) {
    if (value.hasOwnProperty('value') && value.value == 'add') {
      this.setState({ showCreateModal: true });
      return;
    }

    this.props.changeRepo(value);
  }

  render() {
    const options = [
        ...this.props.repos,
        { value: "add", label: "Add repository" }
      ],
      [ repo, branch ] = this.props.curRepo.split('#');

    return <div className="RepoSelect">
      {this.props.auth ? (<div>
        <div className="RepoSelect-current">
          <strong>{repo}</strong>
          on {branch}
        </div>
        <ReactDropdown options={options}
          className="RepoSelect-dropdown"
          onChange={this.onChange}
          value={this.props.curRepo} />

        <ReactModal isOpen={this.state.showCreateModal}
          contentLabel="Add new repo modal"
          onRequestClose={this.closeCreateModal}>
          <h2>Create?</h2>
        </ReactModal>
      </div>) : (
        <h6>Documents</h6>
      )}
    </div>;
  }
}
