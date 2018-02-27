'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ScopesView = undefined;

var _classnames;

function _load_classnames() {
  return _classnames = _interopRequireDefault(require('classnames'));
}

var _UniversalDisposable;

function _load_UniversalDisposable() {
  return _UniversalDisposable = _interopRequireDefault(require('nuclide-commons/UniversalDisposable'));
}

var _react = _interopRequireWildcard(require('react'));

var _bindObservableAsProps;

function _load_bindObservableAsProps() {
  return _bindObservableAsProps = require('nuclide-commons-ui/bindObservableAsProps');
}

var _ScopesComponent;

function _load_ScopesComponent() {
  return _ScopesComponent = require('./ScopesComponent');
}

var _constants;

function _load_constants() {
  return _constants = require('./constants');
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * 
 * @format
 */

class ScopesView extends _react.PureComponent {

  constructor(props) {
    super(props);
    this._scopesComponentWrapped = (0, (_bindObservableAsProps || _load_bindObservableAsProps()).bindObservableAsProps)(props.model.getScopes().map(scopes => ({ scopes })), (_ScopesComponent || _load_ScopesComponent()).ScopesComponent);
    this._disposables = new (_UniversalDisposable || _load_UniversalDisposable()).default();
    this.state = {
      mode: props.model.getDebuggerMode()
    };
  }

  componentDidMount() {
    const { model } = this.props;
    this._disposables.add(model.onChange(() => {
      this.setState({
        mode: model.getDebuggerMode()
      });
    }));
  }

  componentWillUnmount() {
    this._dispose();
  }

  _dispose() {
    this._disposables.dispose();
  }

  render() {
    const { model } = this.props;
    const { mode } = this.state;
    const ScopesComponentWrapped = this._scopesComponentWrapped;
    const disabledClass = mode !== (_constants || _load_constants()).DebuggerMode.RUNNING ? '' : ' nuclide-debugger-container-new-disabled';

    return _react.createElement(
      'div',
      {
        className: (0, (_classnames || _load_classnames()).default)('nuclide-debugger-container-new', disabledClass) },
      _react.createElement(
        'div',
        { className: 'nuclide-debugger-pane-content' },
        _react.createElement(ScopesComponentWrapped, { model: model })
      )
    );
  }
}
exports.ScopesView = ScopesView;