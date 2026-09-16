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

import { useEffect, useState } from 'react';
import type { JSX, MouseEvent } from 'react';
import {
  useActivePlugin,
  useDocsPreferredVersion,
  useDocsVersion,
  useVersions,
} from '@docusaurus/plugin-content-docs/client';
import { useLocation } from '@docusaurus/router';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { DownOutlined } from '@ant-design/icons';

import styles from './styles.module.css';

// Plugin IDs whose docs are versioned and should render the version selector
const VERSIONED_PLUGIN_IDS = [
  'default', // main docs
  'components',
  'tutorials',
  'developer_portal',
];

const VERSION_SEGMENT_PATTERN = /^\d+\.\d+\.\d+$/;

export default function DocVersionBadge(): JSX.Element | null {
  const activePlugin = useActivePlugin();
  const { pathname } = useLocation();
  const pluginId = activePlugin?.pluginId;
  const [versionedPath, setVersionedPath] = useState<string>('');

  const isVersioned =
    pluginId !== undefined && VERSIONED_PLUGIN_IDS.includes(pluginId);

  const { preferredVersion } = useDocsPreferredVersion(pluginId);
  const versions = useVersions(pluginId);
  const version = useDocsVersion();

  // Extract the current page path relative to the version
  useEffect(() => {
    if (!pathname || !version || !pluginId) return;

    let relativePath = '';
    const basePath = pluginId === 'default' ? '/docs' : `/${pluginId}`;

    // Handle different version path patterns
    if (pathname.includes(basePath)) {
      // Extract the part after the base path
      const parts = pathname.split(basePath);
      if (parts.length > 1) {
        const afterBase = parts[1];
        // For versioned paths, remove the version segment
        if (afterBase.startsWith('/')) {
          const segments = afterBase.substring(1).split('/');
          // Check if first segment is a version (e.g., "1.1.0", "next")
          if (
            segments[0] &&
            (VERSION_SEGMENT_PATTERN.test(segments[0]) ||
              segments[0] === 'next')
          ) {
            // Skip the version segment
            relativePath =
              segments.length > 1 ? `/${segments.slice(1).join('/')}` : '';
          } else {
            // No version in path (e.g., /docs/intro for current version with empty path)
            relativePath = afterBase;
          }
        }
      }
    }

    setVersionedPath(relativePath);
  }, [pathname, version, pluginId]);

  // Create dropdown items for version selection
  const items: MenuProps['items'] = versions.map(v => {
    // Construct the URL for this version, preserving the current page
    // v.path contains the full path including base, e.g., "/docs/1.1.0" or "/docs"
    let versionUrl = v.path;

    if (versionedPath) {
      // Append the current page path to the version base
      versionUrl = v.path + versionedPath;
    }

    return {
      key: v.name,
      label: (
        <a href={versionUrl}>
          {v.label}
          {v.name === version.version && ' (current)'}
          {v.name === preferredVersion?.name && ' (preferred)'}
        </a>
      ),
    };
  });

  if (!isVersioned) {
    return null;
  }

  return (
    <span className={styles.versionBadge}>
      Version:{' '}
      <Dropdown menu={{ items }} trigger={['click']}>
        <a
          onClick={(e: MouseEvent<HTMLAnchorElement>) => e.preventDefault()}
          className={styles.versionSelector}
        >
          {version.label} <DownOutlined />
        </a>
      </Dropdown>
    </span>
  );
}
