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

import { ChartPlugin } from '@superset-ui/core';

// Mock d3-selection (ESM module not in transformIgnorePatterns)
jest.mock('d3-selection', () => ({
  select: jest.fn(() => ({
    classed: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    selectAll: jest.fn(() => ({ remove: jest.fn() })),
    append: jest.fn().mockReturnThis(),
    node: jest.fn(),
    text: jest.fn().mockReturnThis(),
  })),
}));

jest.mock('../src/vendor/cal-heatmap', () => {
  function MockCalHeatMap() {}
  MockCalHeatMap.prototype.init = jest.fn();
  return { __esModule: true, default: MockCalHeatMap };
});

// eslint-disable-next-line import/first
import CalendarChartPlugin from '../src/index';

test('CalendarChartPlugin is a subclass of ChartPlugin', () => {
  const plugin = new CalendarChartPlugin();
  expect(plugin).toBeInstanceOf(ChartPlugin);
});

test('CalendarChartPlugin has metadata defined', () => {
  const plugin = new CalendarChartPlugin();
  expect(plugin.metadata).toBeDefined();
});

test('CalendarChartPlugin metadata has correct name', () => {
  const plugin = new CalendarChartPlugin();
  expect(plugin.metadata?.name).toBeDefined();
});

test('CalendarChartPlugin metadata has description', () => {
  const plugin = new CalendarChartPlugin();
  expect(plugin.metadata?.description).toBeDefined();
});

test('CalendarChartPlugin metadata has thumbnail', () => {
  const plugin = new CalendarChartPlugin();
  expect(plugin.metadata?.thumbnail).toBeDefined();
});

test('CalendarChartPlugin metadata has useLegacyApi set to true', () => {
  const plugin = new CalendarChartPlugin();
  expect(plugin.metadata?.useLegacyApi).toBe(true);
});

test('CalendarChartPlugin metadata has tags', () => {
  const plugin = new CalendarChartPlugin();
  expect(plugin.metadata?.tags).toBeDefined();
  expect(Array.isArray(plugin.metadata?.tags)).toBe(true);
  expect(plugin.metadata?.tags?.length).toBeGreaterThan(0);
});

test('CalendarChartPlugin metadata has category', () => {
  const plugin = new CalendarChartPlugin();
  expect(plugin.metadata?.category).toBeDefined();
});

test('CalendarChartPlugin metadata has credits', () => {
  const plugin = new CalendarChartPlugin();
  expect(plugin.metadata?.credits).toBeDefined();
  expect(plugin.metadata?.credits).toContain(
    'https://github.com/wa0x6e/cal-heatmap',
  );
});

test('CalendarChartPlugin metadata has exampleGallery', () => {
  const plugin = new CalendarChartPlugin();
  expect(plugin.metadata?.exampleGallery).toBeDefined();
  expect(plugin.metadata?.exampleGallery?.length).toBeGreaterThan(0);
});

test('CalendarChartPlugin has loadChart function', () => {
  const plugin = new CalendarChartPlugin();
  expect(plugin.loadChart).toBeDefined();
});

test('CalendarChartPlugin has transformProps function', () => {
  const plugin = new CalendarChartPlugin();
  expect(plugin.loadTransformProps).toBeDefined();
});

test('CalendarChartPlugin loadChart returns a module with default export', async () => {
  const plugin = new CalendarChartPlugin();
  const module = await plugin.loadChart!();
  expect(module).toBeDefined();
});

test('CalendarChartPlugin can be configured with a key', () => {
  const plugin = new CalendarChartPlugin();
  const configured = plugin.configure({ key: 'calendar' });
  expect(configured).toBe(plugin);
});
