/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 * @format
 */

import type ImageEditor from './ImageEditor';

import UniversalDisposable from 'nuclide-commons/UniversalDisposable';
import AtomImageEditorView from '../VendorLib/image-view/lib/image-editor-view';

/**
 * This view wraps the vendored one. This is necessary because the Atom ImageEditorView performs
 * a stat on the file so we neeed to make sure that the (local) file exists.
 */
export default class ImageEditorView {
  _disposables: UniversalDisposable;
  _realView: ?AtomImageEditorView;
  element: HTMLElement;

  constructor(editor: ImageEditor) {
    this.element = document.createElement('div');
    this.element.className = 'nuclide-image-view-wrapper';
    this._disposables = new UniversalDisposable(
      // We need to defer loading the real view until the local file is ready because it assumes it
      // exists.
      editor.whenReady(() => {
        // AtomImageEditorView tries to do a stat using the result of `getPath()` so we give it a
        // proxy that always returns the local path instead of the real editor. (We don't want to
        // change the editor's `getPath()` because other things use that for display purposes and we
        // want to show the remote path.)
        const proxy = new Proxy(editor, {
          get(obj, prop) {
            if (prop === 'getPath') {
              return editor.getLocalPath;
            }
            // $FlowIgnore
            return obj[prop];
          },
        });
        this._realView = new AtomImageEditorView(proxy);
        this.element.appendChild(this._realView.element);
      }),
      () => {
        if (this._realView != null) {
          this._realView.destroy();
        }
      },
    );
  }

  getElement() {
    return this.element;
  }

  destroy() {
    this._disposables.dispose();
  }
}
