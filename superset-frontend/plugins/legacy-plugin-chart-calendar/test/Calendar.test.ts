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

// eslint-disable-next-line import/no-extraneous-dependencies
import '@testing-library/jest-dom';
import { supersetTheme } from '@apache-superset/core/theme';

const mockInit = jest.fn();

jest.mock('../src/vendor/cal-heatmap', () => {
  function MockCalHeatMap() {}
  MockCalHeatMap.prototype.init = function (config: Record<string, unknown>) {
    mockInit(config);
  };
  return { __esModule: true, default: MockCalHeatMap };
});

// Mock d3-selection since it is ESM and not in transformIgnorePatterns.
// jest.mock factories cannot reference `document` directly, so we use
// globalThis which is in the allowed list.
jest.mock('d3-selection', () => ({
  select: (el: HTMLElement) => {
    let currentEl: HTMLElement = el;
    const selection: Record<string, Function> = {
      classed: (_cls: string, _val: boolean) => {
        if (_val) currentEl.classList.add(_cls);
        return selection;
      },
      style: (prop: string, val: string | number) => {
        (currentEl.style as Record<string, unknown>)[prop] = String(val);
        return selection;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      selectAll: (_selector: string) => ({
        remove: () => {
          while (currentEl.firstChild) {
            currentEl.removeChild(currentEl.firstChild);
          }
        },
      }),
      append: (tag: string) => {
        const child = globalThis.document.createElement(tag);
        currentEl.appendChild(child);
        currentEl = child;
        return selection;
      },
      node: () => currentEl,
      text: (t: string) => {
        currentEl.textContent = t;
        return selection;
      },
    };
    return selection;
  },
}));

const mockCreateLinearScale = jest.fn(
  () => (v: number) => `rgb(${v}, ${v}, ${v})`,
);
const mockColorScheme = {
  createLinearScale: mockCreateLinearScale,
};

jest.mock('@superset-ui/core', () => {
  const actual = jest.requireActual('@superset-ui/core');
  return {
    ...actual,
    getSequentialSchemeRegistry: () => ({
      get: jest.fn((scheme: string) =>
        scheme === 'nonexistent' ? undefined : mockColorScheme,
      ),
    }),
  };
});

// eslint-disable-next-line import/first
import Calendar from '../src/Calendar';

function createContainer(): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

const baseProps = {
  data: {
    data: {
      count: {
        '1518652800.0': 3,
        '1518048000.0': 2,
        '1518220800.0': 1,
      },
    },
    domain: 'month',
    range: 13,
    start: 1517270400000.0,
    subdomain: 'day',
  },
  height: 400,
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
  timeFormatter: (ts: number | string) => String(ts),
  valueFormatter: (value: number) => String(value),
  verboseMap: { count: 'Count' } as Record<string, string>,
  theme: supersetTheme,
};

function setup() {
  jest.clearAllMocks();
  document.body.innerHTML = '';
}

test('Calendar has displayName set', () => {
  setup();
  expect(Calendar.displayName).toBe('Calendar');
});

test('Calendar adds superset-legacy-chart-calendar class to container', () => {
  setup();
  const container = createContainer();
  Calendar(container, baseProps);
  expect(container).toHaveClass('superset-legacy-chart-calendar');
});

test('Calendar sets height on the container', () => {
  setup();
  const container = createContainer();
  Calendar(container, baseProps);
  expect(container.style.height).toBeDefined();
});

test('Calendar clears previous content before rendering', () => {
  setup();
  const container = createContainer();
  container.innerHTML = '<span>old content</span>';
  Calendar(container, baseProps);
  expect(container.querySelector('span')).toBeNull();
});

test('Calendar calls CalHeatMap.init for each metric', () => {
  setup();
  const container = createContainer();
  Calendar(container, baseProps);
  expect(mockInit).toHaveBeenCalledTimes(1);
});

test('Calendar calls CalHeatMap.init once per metric when multiple metrics', () => {
  setup();
  const container = createContainer();
  const multiMetricProps = {
    ...baseProps,
    data: {
      ...baseProps.data,
      data: {
        count: { '1518652800.0': 3 },
        sum: { '1518652800.0': 100 },
      },
    },
  };
  Calendar(container, multiMetricProps);
  expect(mockInit).toHaveBeenCalledTimes(2);
});

test('Calendar passes correct domain and subdomain config', () => {
  setup();
  const container = createContainer();
  Calendar(container, baseProps);
  const config = mockInit.mock.calls[0][0];
  expect(config.domain).toBe('month');
  expect(config.subDomain).toBe('day');
});

test('Calendar passes correct cellSize, cellPadding, cellRadius', () => {
  setup();
  const container = createContainer();
  Calendar(container, {
    ...baseProps,
    cellSize: 15,
    cellPadding: 5,
    cellRadius: 2,
  });
  const config = mockInit.mock.calls[0][0];
  expect(config.cellSize).toBe(15);
  expect(config.cellPadding).toBe(5);
  expect(config.cellRadius).toBe(2);
});

test('Calendar passes range from data', () => {
  setup();
  const container = createContainer();
  Calendar(container, baseProps);
  const config = mockInit.mock.calls[0][0];
  expect(config.range).toBe(13);
});

test('Calendar passes displayLegend from showLegend', () => {
  setup();
  const container = createContainer();
  Calendar(container, { ...baseProps, showLegend: false });
  const config = mockInit.mock.calls[0][0];
  expect(config.displayLegend).toBe(false);
});

test('Calendar passes tooltip as true', () => {
  setup();
  const container = createContainer();
  Calendar(container, baseProps);
  const config = mockInit.mock.calls[0][0];
  expect(config.tooltip).toBe(true);
});

test('Calendar passes browsing as true', () => {
  setup();
  const container = createContainer();
  Calendar(container, baseProps);
  const config = mockInit.mock.calls[0][0];
  expect(config.browsing).toBe(true);
});

test('Calendar passes legendVerticalPosition as top', () => {
  setup();
  const container = createContainer();
  Calendar(container, baseProps);
  const config = mockInit.mock.calls[0][0];
  expect(config.legendVerticalPosition).toBe('top');
});

test('Calendar passes legendCellPadding as 2', () => {
  setup();
  const container = createContainer();
  Calendar(container, baseProps);
  const config = mockInit.mock.calls[0][0];
  expect(config.legendCellPadding).toBe(2);
});

test('Calendar passes legendCellSize matching cellSize', () => {
  setup();
  const container = createContainer();
  Calendar(container, { ...baseProps, cellSize: 20 });
  const config = mockInit.mock.calls[0][0];
  expect(config.legendCellSize).toBe(20);
});

test('Calendar passes legendCellRadius matching cellRadius', () => {
  setup();
  const container = createContainer();
  Calendar(container, { ...baseProps, cellRadius: 5 });
  const config = mockInit.mock.calls[0][0];
  expect(config.legendCellRadius).toBe(5);
});

test('Calendar passes valueFormatter and timeFormatter', () => {
  setup();
  const container = createContainer();
  const timeFormatter = (ts: number | string) => `time:${ts}`;
  const valueFormatter = (v: number) => `val:${v}`;
  Calendar(container, { ...baseProps, timeFormatter, valueFormatter });
  const config = mockInit.mock.calls[0][0];
  expect(config.valueFormatter).toBe(valueFormatter);
  expect(config.timeFormatter).toBe(timeFormatter);
});

test('Calendar passes itemName as empty string', () => {
  setup();
  const container = createContainer();
  Calendar(container, baseProps);
  const config = mockInit.mock.calls[0][0];
  expect(config.itemName).toBe('');
});

test('Calendar passes legendColors with colorScale, min, max, empty', () => {
  setup();
  const container = createContainer();
  Calendar(container, baseProps);
  const config = mockInit.mock.calls[0][0];
  expect(config.legendColors).toBeDefined();
  expect(config.legendColors.colorScale).toBeDefined();
  expect(config.legendColors.min).toBeDefined();
  expect(config.legendColors.max).toBeDefined();
  expect(config.legendColors.empty).toBe(supersetTheme.colorBgElevated);
});

test('Calendar passes legend array based on steps', () => {
  setup();
  const container = createContainer();
  Calendar(container, baseProps);
  const config = mockInit.mock.calls[0][0];
  expect(config.legend).toHaveLength(10);
});

test('Calendar sets subDomainTextFormat to null when showValues is false', () => {
  setup();
  const container = createContainer();
  Calendar(container, { ...baseProps, showValues: false });
  const config = mockInit.mock.calls[0][0];
  expect(config.subDomainTextFormat).toBeNull();
});

test('Calendar sets subDomainTextFormat to a function when showValues is true', () => {
  setup();
  const container = createContainer();
  Calendar(container, { ...baseProps, showValues: true });
  const config = mockInit.mock.calls[0][0];
  expect(typeof config.subDomainTextFormat).toBe('function');
});

test('Calendar subDomainTextFormat calls valueFormatter when showValues is true', () => {
  setup();
  const container = createContainer();
  const valueFormatter = jest.fn((v: number) => `val:${v}`);
  Calendar(container, { ...baseProps, showValues: true, valueFormatter });
  const config = mockInit.mock.calls[0][0];
  const result = config.subDomainTextFormat(new Date(), 42);
  expect(valueFormatter).toHaveBeenCalledWith(42);
  expect(result).toBe('val:42');
});

test('Calendar renders metric label when showMetricName is true', () => {
  setup();
  const container = createContainer();
  Calendar(container, { ...baseProps, showMetricName: true });
  expect(container).toHaveTextContent(/Count/);
});

test('Calendar uses verboseMap for metric label', () => {
  setup();
  const container = createContainer();
  Calendar(container, {
    ...baseProps,
    showMetricName: true,
    verboseMap: { count: 'My Custom Count' },
  });
  expect(container).toHaveTextContent(/My Custom Count/);
});

test('Calendar falls back to metric key when verboseMap has no entry', () => {
  setup();
  const container = createContainer();
  Calendar(container, {
    ...baseProps,
    showMetricName: true,
    verboseMap: {},
  });
  expect(container).toHaveTextContent(/count/);
});

test('Calendar does not render metric label when showMetricName is false', () => {
  setup();
  const container = createContainer();
  Calendar(container, { ...baseProps, showMetricName: false });
  const divs = container.querySelectorAll('div div div');
  divs.forEach(div => {
    expect(div).not.toHaveTextContent(/Count/);
  });
});

test('Calendar handles empty metric data', () => {
  setup();
  const container = createContainer();
  Calendar(container, {
    ...baseProps,
    data: {
      ...baseProps.data,
      data: {
        count: {},
      },
    },
  });
  expect(mockInit).toHaveBeenCalledTimes(1);
  const config = mockInit.mock.calls[0][0];
  expect(config.legend).toBeDefined();
});

test('Calendar handles steps of 1 without division by zero', () => {
  setup();
  const container = createContainer();
  Calendar(container, { ...baseProps, steps: 1 });
  expect(mockInit).toHaveBeenCalledTimes(1);
  const config = mockInit.mock.calls[0][0];
  expect(config.legend).toHaveLength(1);
});

test('Calendar handles steps of 0', () => {
  setup();
  const container = createContainer();
  Calendar(container, { ...baseProps, steps: 0 });
  expect(mockInit).toHaveBeenCalledTimes(1);
  const config = mockInit.mock.calls[0][0];
  expect(config.legend).toHaveLength(0);
});

test('Calendar handles no metrics in data', () => {
  setup();
  const container = createContainer();
  Calendar(container, {
    ...baseProps,
    data: {
      ...baseProps.data,
      data: {},
    },
  });
  expect(mockInit).not.toHaveBeenCalled();
});

test('Calendar falls back to #ccc color when color scheme is not found', () => {
  setup();
  const container = createContainer();
  Calendar(container, {
    ...baseProps,
    linearColorScheme: 'nonexistent',
  });
  expect(mockInit).toHaveBeenCalledTimes(1);
});

test('Calendar uses default cellPadding of 3 when not provided', () => {
  setup();
  const container = createContainer();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { cellPadding: _, ...propsWithoutPadding } = baseProps;
  Calendar(container, propsWithoutPadding as typeof baseProps);
  const config = mockInit.mock.calls[0][0];
  expect(config.cellPadding).toBe(3);
});

test('Calendar uses default cellRadius of 0 when not provided', () => {
  setup();
  const container = createContainer();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { cellRadius: _, ...propsWithoutRadius } = baseProps;
  Calendar(container, propsWithoutRadius as typeof baseProps);
  const config = mockInit.mock.calls[0][0];
  expect(config.cellRadius).toBe(0);
});

test('Calendar uses default cellSize of 10 when not provided', () => {
  setup();
  const container = createContainer();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { cellSize: _, ...propsWithoutSize } = baseProps;
  Calendar(container, propsWithoutSize as typeof baseProps);
  const config = mockInit.mock.calls[0][0];
  expect(config.cellSize).toBe(10);
});

test('Calendar converts UTC start timestamp to local', () => {
  setup();
  const container = createContainer();
  Calendar(container, baseProps);
  const config = mockInit.mock.calls[0][0];
  const expectedOffset =
    new Date(baseProps.data.start).getTimezoneOffset() * 60 * 1000;
  expect(config.start).toBe(baseProps.data.start + expectedOffset);
});
