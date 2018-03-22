import React from 'react';
import { findDOMNode } from 'react-dom';
import ReactModal from 'react-modal';
import ReactDropdown from 'react-dropdown';

import { CLIENT_ID } from '@utils/consts';

export default class TopBar extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showAuthModal: false,
      showLogoutModal: false,
      showUserDropdown: false
    }

    // Here, we hack ReactDropdown to act as a user menu
    // This works by manually constructing the component, polyfilling some
    // of the click handlers, and when rendering only doing so on the menu
    // We do this because there is no way to control the visibility of the
    // dropdown, and because we don't want to add another component.
    // Downside: Because the dropdown isn't actually mounted, warnings will
    // appear regarding setState inside Dropdown

    const userActions = [
      { value: 'settings', label: 'Settings' },
      { value: 'logout', label: 'Log out', className: 'User-logout' }
    ];

    this.Dropdown = new ReactDropdown({
      options: userActions,
      onChange: this.handleUserAction.bind(this),
      baseClassName: "Dropdown"
    });

    document.addEventListener('click', ({ target }) => {
      if (this.state.showUserDropdown &&
          !findDOMNode(this.refs.user).contains(target)) {
        this.setState({ showUserDropdown: false });
      }
    });

    this.openAuthModal = this.openAuthModal.bind(this);
    this.closeAuthModal = this.closeAuthModal.bind(this);
    this.openLogoutModal = this.openLogoutModal.bind(this);
    this.closeLogoutModal = this.closeLogoutModal.bind(this);

    this.authenticate = this.authenticate.bind(this);
    this.logout = this.logout.bind(this);

    this.toggleUserDropdown = this.toggleUserDropdown.bind(this);
  }

  openAuthModal() {
    this.setState({ showAuthModal: true });
  }

  closeAuthModal() {
    this.setState({ showAuthModal: false });
  }

  openLogoutModal() {
    this.setState({ showLogoutModal: true });
  }

  closeLogoutModal() {
    this.setState({ showLogoutModal: false });
  }

  authenticate() {
    this.props.authFn(this.refs.saveLogin.checked)
      .then(() => { this.closeAuthModal() });
  }

  logout() {
    this.props.logoutFn();
    this.closeLogoutModal();
  }

  handleUserAction({ value }) {
    switch (value) {
    case 'logout':
      this.openLogoutModal();
      break;
    }
  }

  toggleUserDropdown(event) {
    event.stopPropagation();
    event.preventDefault();

    const showUserDropdown = !this.state.showUserDropdown;
    this.setState({ showUserDropdown });
  }

  render() {
    const appUrl = `https://github.com/settings/connections/applications/${CLIENT_ID}`
    return <div className="flex-row TopBar">
      <div className="User" ref="user">
        {this.props.auth ? (<div className="Dropdown-root">
          <div className="Dropdown-control" onClick={this.toggleUserDropdown}>
            <div className="Dropdown-placeholder">
              <span className="User-name">Hello, {this.props.userName}!</span>
              <img src={this.props.userAvatar} alt="User avatar" className="User-avatar" />
            </div>
            <span class="Dropdown-arrow"></span>
          </div>
          {this.state.showUserDropdown && <div className="Dropdown-menu">
            {this.Dropdown.buildMenu()}
          </div>}
        </div>) : (
          <a onClick={this.openAuthModal}>Log in</a>
        )}
      </div>

      <ReactModal isOpen={this.state.showAuthModal}
        contentLabel="Authentication modal"
        onRequestClose={this.closeAuthModal}>
        <h2>Authenticate through OAuth.</h2>
        <p>It looks like you haven't logged in to this app on this computer before.</p>
        <label><input type="checkbox" ref="saveLogin" /> Save login across sessions on this computer</label>
        <button className="button-primary" onClick={this.authenticate}>Login</button>
      </ReactModal>
      <ReactModal isOpen={this.state.showLogoutModal}
        contentLabel="Logout modal"
        onRequestClose={this.closeLogoutModal}>
        <h2>Logout from this browser?</h2>
        <p>This will only log you out from this app <em>on this browser</em>.</p>
        <p>If you wish to revoke authorization, <a href={appUrl}>do so here</a>.</p>
        <button className="button-primary" onClick={this.logout}>Logout</button>
      </ReactModal>
    </div>;
  }
}
