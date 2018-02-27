import React from 'react';

export default class Preview extends React.Component {
  render() {
    return <article id='preview' dangerouslySetInnerHTML={this.props.html} />;
  }
}
