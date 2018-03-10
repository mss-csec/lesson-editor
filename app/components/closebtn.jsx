import React from 'react';

export default function CloseBtn(props) {
  return <a className="CloseBtn" onClick={props.onClick}>&times;</a>;
}
