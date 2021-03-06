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

import type {StreamMessageWriter} from 'vscode-jsonrpc';
import type {Message} from 'vscode-jsonrpc';
import type {
  DidOpenTextDocumentParams,
  DidCloseTextDocumentParams,
} from '../../../nuclide-vscode-language-service-rpc/lib/protocol';
import type {FlagsInfo} from './FlagUtils';

import log4js from 'log4js';
import nuclideUri from 'nuclide-commons/nuclideUri';
import performanceNow from 'nuclide-commons/performanceNow';
import {readCompilationFlags} from '../../../nuclide-clang-rpc/lib/clang-flags-reader';
import {lspUri_localPath} from '../../../nuclide-vscode-language-service-rpc/lib/convert';
import {MessageType} from '../../../nuclide-vscode-language-service-rpc/lib/protocol';
import {flagsInfoForPath} from './FlagUtils';
import {windowMessage, addDbMessage} from './messages';

const logger = log4js.getLogger('nuclide-cquery-wrapper');

const KNOWN_METHODS = ['textDocument/didOpen', 'textDocument/didClose'];

/**
 * Message handlers defined here perform processing on messages from the
 * client (Nuclide) and then forward to the server (cquery).
 */
export class MessageHandler {
  // Writes to cquery.
  _serverWriter: StreamMessageWriter;
  // Writes to client.
  _clientWriter: StreamMessageWriter;
  // Map source file to its flags def file (either buck or compile_commands.json)
  _knownFileMap: Map<string, string> = new Map();
  // Set of known compilation database folders.
  _knownCompileCommandsSet: Set<string> = new Set();
  // Map of pending opened files to their command resolution promise.
  // A file in this map means that we've seen its didOpen but have not resolved
  // its compile commands from Buck or the filesystem.
  // Used to resolve races between open/close events.
  _pendingOpenRequests: Map<string, Promise<?FlagsInfo>> = new Map();

  constructor(
    serverWriter: StreamMessageWriter,
    clientWriter: StreamMessageWriter,
  ) {
    this._serverWriter = serverWriter;
    this._clientWriter = clientWriter;
  }

  /**
   * Return whether this message handler can handle the message.
   */
  canHandle(message: Message): boolean {
    const method: ?string = ((message: any): {method: ?string}).method;
    return KNOWN_METHODS.indexOf(method) !== -1;
  }
  /**
   * Attempt to handle the given message.
   */
  async handle(message: Message): mixed {
    const method: ?string = ((message: any): {method: ?string}).method;
    if (method != null) {
      switch (method) {
        case 'textDocument/didOpen':
          return this._didOpen(message);
        case 'textDocument/didClose':
          return this._didClose(message);
      }
    }
  }

  /**
   * Return the currently known compilation databases.
   */
  knownProjects(): Array<string> {
    return Array.from(this._knownCompileCommandsSet);
  }

  async _didOpen(openMessage: Message): mixed {
    const params = ((openMessage: any).params: DidOpenTextDocumentParams);
    const path = lspUri_localPath(params.textDocument.uri);
    if (this._knownFileMap.has(path)) {
      // If we have seen the path then don't find a compilation database again.
      return this._serverWriter.write(openMessage);
    } else if (this._pendingOpenRequests.has(path)) {
      // If there's another open request still in flight then drop the request.
      this._clientWriter.write(
        windowMessage(MessageType.Info, `${path} still being opened`),
      );
      return;
    }
    const startTime = performanceNow();
    this._clientWriter.write(
      windowMessage(MessageType.Info, `Looking for flags of ${path}`),
    );
    let flagsInfo = null;
    let resolveOpenRequest = () => {};
    this._pendingOpenRequests.set(
      path,
      new Promise((resolve, _) => {
        resolveOpenRequest = resolve;
      }),
    );
    try {
      flagsInfo = await flagsInfoForPath(path);
    } catch (e) {
      logger.error(`Error finding flags for ${path}, ${e}`);
    } finally {
      this._pendingOpenRequests.delete(path);
    }
    const duration = performanceNow() - startTime;
    if (flagsInfo != null) {
      const {databaseDirectory, flagsFile} = flagsInfo;
      const databaseFile = nuclideUri.join(
        databaseDirectory,
        'compile_commands.json',
      );
      this._clientWriter.write(
        windowMessage(
          MessageType.Info,
          `Found flags for ${path} at ${flagsFile} in ${duration}ms`,
        ),
      );
      this._knownFileMap.set(path, flagsFile);
      if (!this._knownCompileCommandsSet.has(databaseDirectory)) {
        this._knownCompileCommandsSet.add(databaseDirectory);
        this._serverWriter.write(addDbMessage(databaseDirectory));
        // Read the database file and cache listed files as known.
        readCompilationFlags(databaseFile).subscribe(entry =>
          this._knownFileMap.set(entry.file, flagsFile),
        );
      }
    } else {
      this._clientWriter.write(
        windowMessage(
          MessageType.Warning,
          `Could not find flags for ${path} in ${duration}ms, diagnostics may not be correct.`,
        ),
      );
    }
    this._serverWriter.write(openMessage);
    resolveOpenRequest();
  }
  async _didClose(closeMessage: Message): mixed {
    const params = ((closeMessage: any).params: DidCloseTextDocumentParams);
    const path = lspUri_localPath(params.textDocument.uri);
    // If user closes the file while the open request is pending, then wait
    // for the open request to finish before emitting the close notification.
    // Otherwise we could end up with inconsistent state with server thinking
    // the file is open when the client has closed it.
    try {
      if (this._pendingOpenRequests.has(path)) {
        this._clientWriter.write(
          windowMessage(
            MessageType.Warning,
            `${path} closed before we finished opening it`,
          ),
        );
        await this._pendingOpenRequests.get(path);
      }
    } finally {
      this._serverWriter.write(closeMessage);
    }
  }
}
