/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Apache Superset MCP Server
 *
 * Entry point for the MCP server when used as a Node.js module.
 */

import { type ChildProcess } from 'child_process';

class SupersetMCPServer {
  private readonly options: SupersetMCPServer.ResolvedOptions;

  private process: ChildProcess | null;

  constructor(options: SupersetMCPServer.Options = {}) {
    this.options = {
      transport: options.transport || 'http',
      host: options.host || '127.0.0.1',
      port: options.port || 5008,
      debug: options.debug || false,
      pythonPath: options.pythonPath || null,
      supersetRoot: options.supersetRoot || null,
      configPath: options.configPath || null,
    };
    this.process = null;
  }

  start(): void {
    require('./bin/superset-mcp.js');
    // The bin script handles the execution
  }

  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace SupersetMCPServer {
  export type Transport = 'http' | 'stdio';

  export interface Options {
    transport?: Transport;
    host?: string;
    port?: number;
    debug?: boolean;
    pythonPath?: string | null;
    supersetRoot?: string | null;
    configPath?: string | null;
  }

  export type ResolvedOptions = Required<Options>;
}

export = SupersetMCPServer;
