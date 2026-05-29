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
import { shallowEqual as reactReduxShallowEqual } from 'react-redux';

/**
 * react-redux's `shallowEqual` is typed as `(a: any, b: any) => boolean`. When
 * passed as the equality function to `useSelector`, the `any` parameters poison
 * the `Selected` type inference, causing the hook to return `any` and silently
 * dropping type safety for the selected state.
 *
 * This re-export gives `shallowEqual` a generic signature so that `useSelector`
 * can correctly infer the selected state type while keeping the exact same
 * runtime implementation.
 */
export const shallowEqual: <T>(a: T, b: T) => boolean = reactReduxShallowEqual;

export default shallowEqual;
