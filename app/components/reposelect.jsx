import React from 'react';
import ReactDropdown from 'react-dropdown';

export default class RepoSelect extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return <div className="RepoSelect">
      {this.props.auth ? (<div>
        <div class="RepoSelect-current">
          <strong>{this.props.repo}</strong>
          {this.props.branch}
        </div>
        <ReactDropdown options={this.props.repos}
          className="RepoSelect-dropdown"
          onChange={this.props.changeRepo} />
      </div>) : (
        <h6>Documents</h6>
      )}
    </div>;
  }
}
