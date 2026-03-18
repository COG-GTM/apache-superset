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
import RoseChartPlugin from '../src';

test('RoseChartPlugin: should create a new instance', () => {
  const plugin = new RoseChartPlugin();
  expect(plugin).toBeDefined();
});

test('RoseChartPlugin: should have correct metadata', () => {
  const plugin = new RoseChartPlugin();
  const metadata = plugin.metadata;
  expect(metadata).toBeDefined();
  expect(metadata?.name).toBeTruthy();
  expect(metadata?.credits).toEqual(['https://echarts.apache.org']);
});

test('RoseChartPlugin: should have buildQuery', () => {
  const plugin = new RoseChartPlugin();
  expect(plugin.loadBuildQuery).toBeDefined();
});

test('RoseChartPlugin: should have transformProps', () => {
  const plugin = new RoseChartPlugin();
  expect(plugin.loadTransformProps).toBeDefined();
});
