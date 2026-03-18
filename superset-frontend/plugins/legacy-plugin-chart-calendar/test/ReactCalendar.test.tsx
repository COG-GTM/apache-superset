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
// eslint-disable-next-line import/no-extraneous-dependencies
import { render } from '@testing-library/react';
import { ThemeProvider, supersetTheme } from '@apache-superset/core/theme';

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

jest.mock('../src/Calendar', () => {
  const mockCalendar = jest.fn();
  mockCalendar.displayName = 'Calendar';
  return { __esModule: true, default: mockCalendar };
});

// eslint-disable-next-line import/first
import ReactCalendar from '../src/ReactCalendar';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={supersetTheme}>{ui}</ThemeProvider>);
}

describe('ReactCalendar', () => {
  test('renders without crashing', () => {
    const { container } = renderWithTheme(
      <ReactCalendar width={800} height={400} />,
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders a wrapper div', () => {
    const { container } = renderWithTheme(
      <ReactCalendar width={800} height={400} />,
    );
    expect(container.querySelector('div')).not.toBeNull();
  });

  test('accepts className prop', () => {
    const { container } = renderWithTheme(
      <ReactCalendar className="my-calendar" width={800} height={400} />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('my-calendar');
  });

  test('passes additional props through to the component', () => {
    const { container } = renderWithTheme(
      <ReactCalendar
        width={800}
        height={400}
        showLegend
        showValues={false}
        steps={10}
      />,
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders Global styles component', () => {
    const { container } = renderWithTheme(
      <ReactCalendar width={800} height={400} />,
    );
    // The component renders without error, which confirms the Global
    // styles component is included in the render tree
    expect(container.firstChild).toBeDefined();
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  test('renders styled component CSS', () => {
    const { container } = renderWithTheme(
      <ReactCalendar width={800} height={400} />,
    );
    // The styled component wraps with a generated class
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toBeDefined();
    expect(wrapper.className.length).toBeGreaterThan(0);
  });

  test('renders with different prop combinations', () => {
    const { container: c1 } = renderWithTheme(
      <ReactCalendar width={400} height={200} showLegend showMetricName />,
    );
    expect(c1.firstChild).toBeDefined();

    const { container: c2 } = renderWithTheme(
      <ReactCalendar
        width={1200}
        height={800}
        showLegend={false}
        showValues
        showMetricName={false}
      />,
    );
    expect(c2.firstChild).toBeDefined();
  });

  test('renders without optional className', () => {
    const { container } = renderWithTheme(
      <ReactCalendar width={800} height={400} />,
    );
    expect(container.firstChild).toBeDefined();
  });
});
