/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

jest.mock('../../commons-node/passesGK');
import invariant from 'assert';
import passesGK from '../../commons-node/passesGK';
// $FlowFixMe Jest doesn't have a type safe way to do this.
(passesGK: any).mockImplementation(async () => true);

import nuclideUri from 'nuclide-commons/nuclideUri';
const {
  getExportsForFile,
  ExportUpdateForFile,
} = require('../src/lib/AutoImportsWorker');

describe('getExportsForFile component definitions', () => {
  it('gets the component definition for a React component', async () => {
    const path = nuclideUri.join(
      __dirname,
      '..',
      '__mocks__',
      'componentDefinitions',
      'FDSTest.js',
    );
    const exportUpdate: ?ExportUpdateForFile = await getExportsForFile(path, {
      isHaste: false,
      useNameReducers: false,
      nameReducers: [],
      nameReducerWhitelist: [],
      nameReducerBlacklist: [],
    });
    expect(exportUpdate).toBeTruthy();
    invariant(exportUpdate != null);
    expect(exportUpdate.componentDefinition).toBeTruthy();
    invariant(exportUpdate.componentDefinition);
    expect(exportUpdate.componentDefinition.name).toBe('FDSTest');
    invariant(exportUpdate.componentDefinition);
    expect(
      exportUpdate.componentDefinition.requiredProps.length,
    ).toBeGreaterThan(0);
  });
});
