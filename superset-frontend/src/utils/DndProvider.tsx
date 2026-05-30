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
import type { FC, PropsWithChildren } from 'react';
import type { BackendFactory } from 'dnd-core';
import { DndProvider as BaseDndProvider } from 'react-dnd';

/**
 * react-dnd v11's `DndProvider` is typed as `React.FC<DndProviderProps>`, which
 * under React 18's `@types/react` no longer implicitly accepts `children`. This
 * re-export restores `children` support without changing runtime behavior.
 */
export const DndProvider = BaseDndProvider as unknown as FC<
  PropsWithChildren<{ backend: BackendFactory }>
>;

export default DndProvider;
