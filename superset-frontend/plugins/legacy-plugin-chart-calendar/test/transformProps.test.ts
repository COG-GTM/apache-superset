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

import { ChartProps } from '@superset-ui/core';
import { supersetTheme } from '@apache-superset/core/theme';
import transformProps from '../src/transformProps';

const baseFormData = {
  cellPadding: 3,
  cellRadius: 0,
  cellSize: 10,
  domainGranularity: 'month',
  linearColorScheme: 'schemeRdYlBu',
  showLegend: true,
  showMetricName: true,
  showValues: false,
  steps: 10,
  subdomainGranularity: 'day',
  xAxisTimeFormat: '%Y-%m-%d',
  yAxisFormat: '.3s',
};

const baseQueriesData = [
  {
    data: {
      data: {
        count: {
          '1518652800.0': 3,
          '1518048000.0': 2,
        },
      },
      start: 1517270400000.0,
      domain: 'month',
      range: 13,
      subdomain: 'day',
    },
  },
];

const baseDatasource = {
  verboseMap: { count: 'Count' },
};

function createChartProps(overrides: Record<string, unknown> = {}) {
  return new ChartProps({
    formData: { ...baseFormData, ...overrides },
    width: 800,
    height: 600,
    queriesData: baseQueriesData,
    datasource: baseDatasource,
    theme: supersetTheme,
  });
}

describe('transformProps', () => {
  test('extracts height from chartProps', () => {
    const result = transformProps(createChartProps());
    expect(result.height).toBe(600);
  });

  test('extracts data from queriesData', () => {
    const result = transformProps(createChartProps());
    expect(result.data).toEqual(baseQueriesData[0].data);
  });

  test('extracts cellPadding from formData', () => {
    const result = transformProps(createChartProps({ cellPadding: 5 }));
    expect(result.cellPadding).toBe(5);
  });

  test('extracts cellRadius from formData', () => {
    const result = transformProps(createChartProps({ cellRadius: 2 }));
    expect(result.cellRadius).toBe(2);
  });

  test('extracts cellSize from formData', () => {
    const result = transformProps(createChartProps({ cellSize: 15 }));
    expect(result.cellSize).toBe(15);
  });

  test('extracts domainGranularity from formData', () => {
    const result = transformProps(
      createChartProps({ domainGranularity: 'year' }),
    );
    expect(result.domainGranularity).toBe('year');
  });

  test('extracts linearColorScheme from formData', () => {
    const result = transformProps(
      createChartProps({ linearColorScheme: 'schemeBlues' }),
    );
    expect(result.linearColorScheme).toBe('schemeBlues');
  });

  test('extracts showLegend from formData', () => {
    const result = transformProps(createChartProps({ showLegend: false }));
    expect(result.showLegend).toBe(false);
  });

  test('extracts showMetricName from formData', () => {
    const result = transformProps(createChartProps({ showMetricName: false }));
    expect(result.showMetricName).toBe(false);
  });

  test('extracts showValues from formData', () => {
    const result = transformProps(createChartProps({ showValues: true }));
    expect(result.showValues).toBe(true);
  });

  test('extracts steps from formData', () => {
    const result = transformProps(createChartProps({ steps: 5 }));
    expect(result.steps).toBe(5);
  });

  test('extracts subdomainGranularity from formData', () => {
    const result = transformProps(
      createChartProps({ subdomainGranularity: 'hour' }),
    );
    expect(result.subdomainGranularity).toBe('hour');
  });

  test('extracts verboseMap from datasource', () => {
    const result = transformProps(createChartProps());
    expect(result.verboseMap).toEqual({ count: 'Count' });
  });

  test('creates a timeFormatter function', () => {
    const result = transformProps(createChartProps());
    expect(typeof result.timeFormatter).toBe('function');
  });

  test('timeFormatter formats timestamps', () => {
    const result = transformProps(
      createChartProps({ xAxisTimeFormat: '%Y-%m-%d' }),
    );
    const formatted = result.timeFormatter(1704067200000);
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });

  test('creates a valueFormatter function', () => {
    const result = transformProps(createChartProps());
    expect(typeof result.valueFormatter).toBe('function');
  });

  test('valueFormatter formats numbers', () => {
    const result = transformProps(createChartProps({ yAxisFormat: '.3s' }));
    const formatted = result.valueFormatter(1500);
    expect(typeof formatted).toBe('string');
  });

  test('returns all expected keys', () => {
    const result = transformProps(createChartProps());
    expect(Object.keys(result).sort()).toEqual(
      [
        'height',
        'data',
        'cellPadding',
        'cellRadius',
        'cellSize',
        'domainGranularity',
        'linearColorScheme',
        'showLegend',
        'showMetricName',
        'showValues',
        'steps',
        'subdomainGranularity',
        'timeFormatter',
        'valueFormatter',
        'verboseMap',
      ].sort(),
    );
  });

  test('passes through default formData values', () => {
    const result = transformProps(createChartProps());
    expect(result).toEqual(
      expect.objectContaining({
        cellPadding: 3,
        cellRadius: 0,
        cellSize: 10,
        domainGranularity: 'month',
        linearColorScheme: 'schemeRdYlBu',
        showLegend: true,
        showMetricName: true,
        showValues: false,
        steps: 10,
        subdomainGranularity: 'day',
      }),
    );
  });
});
