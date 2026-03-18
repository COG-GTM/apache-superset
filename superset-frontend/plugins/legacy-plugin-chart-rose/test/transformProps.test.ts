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
import {
  ChartProps,
  getNumberFormatter,
  SqlaFormData,
} from '@superset-ui/core';
import { supersetTheme } from '@apache-superset/core/theme';
import type { PieSeriesOption } from 'echarts/charts';
import type {
  LabelFormatterCallback,
  CallbackDataParams,
} from 'echarts/types/src/util/types';
import transformProps, { parseParams } from '../src/transformProps';
import { EchartsRoseChartProps } from '../src/types';

describe('Rose transformProps', () => {
  const formData: SqlaFormData = {
    colorScheme: 'bnbColors',
    datasource: '3__table',
    granularity_sqla: 'ds',
    metric: 'sum__num',
    groupby: ['foo', 'bar'],
    viz_type: 'rose',
  };

  const chartProps = new ChartProps({
    formData,
    width: 800,
    height: 600,
    queriesData: [
      {
        data: [
          { foo: 'Sylvester', bar: 1, sum__num: 10 },
          { foo: 'Arnold', bar: 2, sum__num: 2.5 },
        ],
      },
    ],
    theme: supersetTheme,
  });

  test('should transform chart props for viz', () => {
    const transformed = transformProps(chartProps as EchartsRoseChartProps);
    expect(transformed).toEqual(
      expect.objectContaining({
        width: 800,
        height: 600,
        echartOptions: expect.objectContaining({
          series: [
            expect.objectContaining({
              type: 'pie',
              roseType: 'radius',
              avoidLabelOverlap: true,
              data: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Sylvester, 1',
                  value: 10,
                }),
                expect.objectContaining({
                  name: 'Arnold, 2',
                  value: 2.5,
                }),
              ]),
            }),
          ],
        }),
      }),
    );
  });

  test('should use area roseType when useAreaProportions is true', () => {
    const areaFormData: SqlaFormData = {
      ...formData,
      use_area_proportions: true,
    };
    const areaChartProps = new ChartProps({
      formData: areaFormData,
      width: 800,
      height: 600,
      queriesData: [
        {
          data: [
            { foo: 'Sylvester', bar: 1, sum__num: 10 },
            { foo: 'Arnold', bar: 2, sum__num: 2.5 },
          ],
        },
      ],
      theme: supersetTheme,
    });
    const transformed = transformProps(
      areaChartProps as EchartsRoseChartProps,
    );
    const series = transformed.echartOptions.series as PieSeriesOption[];
    expect(series[0].roseType).toBe('area');
  });

  test('should use radius roseType when useAreaProportions is false', () => {
    const radiusFormData: SqlaFormData = {
      ...formData,
      use_area_proportions: false,
    };
    const radiusChartProps = new ChartProps({
      formData: radiusFormData,
      width: 800,
      height: 600,
      queriesData: [
        {
          data: [
            { foo: 'Sylvester', bar: 1, sum__num: 10 },
            { foo: 'Arnold', bar: 2, sum__num: 2.5 },
          ],
        },
      ],
      theme: supersetTheme,
    });
    const transformed = transformProps(
      radiusChartProps as EchartsRoseChartProps,
    );
    const series = transformed.echartOptions.series as PieSeriesOption[];
    expect(series[0].roseType).toBe('radius');
  });

  test('should return labelMap', () => {
    const transformed = transformProps(chartProps as EchartsRoseChartProps);
    expect(transformed.labelMap).toEqual({
      'Sylvester, 1': ['Sylvester', 1],
      'Arnold, 2': ['Arnold', 2],
    });
  });

  test('should have donut shape when isDonut is true', () => {
    const donutFormData: SqlaFormData = {
      ...formData,
      is_donut: true,
      innerRadius: 40,
    };
    const donutChartProps = new ChartProps({
      formData: donutFormData,
      width: 800,
      height: 600,
      queriesData: [
        {
          data: [
            { foo: 'Sylvester', bar: 1, sum__num: 10 },
          ],
        },
      ],
      theme: supersetTheme,
    });
    const transformed = transformProps(
      donutChartProps as EchartsRoseChartProps,
    );
    const series = transformed.echartOptions.series as PieSeriesOption[];
    expect(series[0].radius).toEqual(['40%', '70%']);
  });

  test('should have filled shape when isDonut is false', () => {
    const filledFormData: SqlaFormData = {
      ...formData,
      is_donut: false,
    };
    const filledChartProps = new ChartProps({
      formData: filledFormData,
      width: 800,
      height: 600,
      queriesData: [
        {
          data: [
            { foo: 'Sylvester', bar: 1, sum__num: 10 },
          ],
        },
      ],
      theme: supersetTheme,
    });
    const transformed = transformProps(
      filledChartProps as EchartsRoseChartProps,
    );
    const series = transformed.echartOptions.series as PieSeriesOption[];
    expect(series[0].radius).toEqual(['0%', '70%']);
  });

  test('should handle empty data', () => {
    const emptyChartProps = new ChartProps({
      formData,
      width: 800,
      height: 600,
      queriesData: [{ data: [] }],
      theme: supersetTheme,
    });
    const transformed = transformProps(
      emptyChartProps as EchartsRoseChartProps,
    );
    const series = transformed.echartOptions.series as PieSeriesOption[];
    expect(series[0].data).toEqual([]);
  });
});

describe('Rose parseParams', () => {
  test('should generate a valid label', () => {
    const numberFormatter = getNumberFormatter();
    const params = { name: 'My Label', value: 1234, percent: 12.34 };
    expect(
      parseParams({
        params,
        numberFormatter,
      }),
    ).toEqual(['My Label', '1.23k', '12.34%']);
  });

  test('should handle null-like names', () => {
    const numberFormatter = getNumberFormatter();
    const params = { name: '<NULL>', value: 1234, percent: 12.34 };
    expect(
      parseParams({
        params,
        numberFormatter,
      }),
    ).toEqual(['<NULL>', '1.23k', '12.34%']);
  });

  test('should sanitize HTML in name when sanitizeName is true', () => {
    const numberFormatter = getNumberFormatter();
    const params = { name: '<NULL>', value: 1234, percent: 12.34 };
    expect(
      parseParams({
        params,
        numberFormatter,
        sanitizeName: true,
      }),
    ).toEqual(['&lt;NULL&gt;', '1.23k', '12.34%']);
  });
});

describe('Rose label formatting', () => {
  const params: CallbackDataParams = {
    componentType: '',
    componentSubType: '',
    componentIndex: 0,
    seriesType: 'pie',
    seriesIndex: 0,
    seriesId: 'seriesId',
    seriesName: 'test',
    name: 'Tablet',
    dataIndex: 0,
    data: {},
    value: 123456,
    percent: 55.5,
    $vars: [],
  };

  const getChartProps = (
    form: Partial<SqlaFormData>,
  ): EchartsRoseChartProps => {
    const formData: SqlaFormData = {
      colorScheme: 'bnbColors',
      datasource: '3__table',
      granularity_sqla: 'ds',
      metric: 'sum__num',
      groupby: ['foo', 'bar'],
      viz_type: 'rose',
      ...form,
    };

    return new ChartProps({
      formData,
      width: 800,
      height: 600,
      queriesData: [
        {
          data: [
            { foo: 'Sylvester', bar: 1, sum__num: 10 },
            { foo: 'Arnold', bar: 2, sum__num: 2.5 },
          ],
        },
      ],
      theme: supersetTheme,
    }) as EchartsRoseChartProps;
  };

  const format = (form: Partial<SqlaFormData>) => {
    const props = transformProps(getChartProps(form));
    const formatter = (props.echartOptions.series as PieSeriesOption[])[0]!
      .label?.formatter;

    return (formatter as LabelFormatterCallback)(params);
  };

  test('should format label as key', () => {
    expect(format({ label_type: 'key' })).toEqual('Tablet');
  });

  test('should format label as value', () => {
    expect(format({ label_type: 'value' })).toEqual('123k');
  });

  test('should format label as percent', () => {
    expect(format({ label_type: 'percent' })).toEqual('55.50%');
  });

  test('should format label as key_value', () => {
    expect(format({ label_type: 'key_value' })).toEqual('Tablet: 123k');
  });

  test('should format label as key_percent', () => {
    expect(format({ label_type: 'key_percent' })).toEqual(
      'Tablet: 55.50%',
    );
  });

  test('should format label as key_value_percent', () => {
    expect(format({ label_type: 'key_value_percent' })).toEqual(
      'Tablet: 123k (55.50%)',
    );
  });
});

describe('Rose legend sorting', () => {
  const defaultFormData: SqlaFormData = {
    colorScheme: 'bnbColors',
    datasource: '3__table',
    granularity_sqla: 'ds',
    metric: 'metric',
    groupby: ['foo', 'bar'],
    viz_type: 'rose',
  };

  const getChartProps = (formData: Partial<SqlaFormData>) =>
    new ChartProps({
      formData: {
        ...defaultFormData,
        ...formData,
      },
      width: 800,
      height: 600,
      queriesData: [
        {
          data: [
            { foo: 'A foo', bar: 'A bar', metric: 1 },
            { foo: 'D foo', bar: 'D bar', metric: 2 },
            { foo: 'C foo', bar: 'C bar', metric: 3 },
            { foo: 'B foo', bar: 'B bar', metric: 4 },
            { foo: 'E foo', bar: 'E bar', metric: 5 },
          ],
        },
      ],
      theme: supersetTheme,
    });

  test('sort legend by data order when legendSort is null', () => {
    const chartProps = getChartProps({ legendSort: null });
    const transformed = transformProps(
      chartProps as EchartsRoseChartProps,
    );

    expect((transformed.echartOptions.legend as any).data).toEqual([
      'A foo, A bar',
      'D foo, D bar',
      'C foo, C bar',
      'B foo, B bar',
      'E foo, E bar',
    ]);
  });

  test('sort legend by label ascending', () => {
    const chartProps = getChartProps({ legendSort: 'asc' });
    const transformed = transformProps(
      chartProps as EchartsRoseChartProps,
    );

    expect((transformed.echartOptions.legend as any).data).toEqual([
      'A foo, A bar',
      'B foo, B bar',
      'C foo, C bar',
      'D foo, D bar',
      'E foo, E bar',
    ]);
  });

  test('sort legend by label descending', () => {
    const chartProps = getChartProps({ legendSort: 'desc' });
    const transformed = transformProps(
      chartProps as EchartsRoseChartProps,
    );

    expect((transformed.echartOptions.legend as any).data).toEqual([
      'E foo, E bar',
      'D foo, D bar',
      'C foo, C bar',
      'B foo, B bar',
      'A foo, A bar',
    ]);
  });
});

describe('Rose legend visibility', () => {
  const formData: SqlaFormData = {
    colorScheme: 'bnbColors',
    datasource: '3__table',
    granularity_sqla: 'ds',
    metric: 'sum__num',
    groupby: ['foo'],
    viz_type: 'rose',
  };

  test('should show legend when showLegend is true', () => {
    const chartProps = new ChartProps({
      formData: { ...formData, show_legend: true },
      width: 800,
      height: 600,
      queriesData: [
        { data: [{ foo: 'A', sum__num: 10 }] },
      ],
      theme: supersetTheme,
    });
    const transformed = transformProps(
      chartProps as EchartsRoseChartProps,
    );
    expect((transformed.echartOptions.legend as any).show).toBe(true);
  });

  test('should hide legend when showLegend is false', () => {
    const chartProps = new ChartProps({
      formData: { ...formData, show_legend: false },
      width: 800,
      height: 600,
      queriesData: [
        { data: [{ foo: 'A', sum__num: 10 }] },
      ],
      theme: supersetTheme,
    });
    const transformed = transformProps(
      chartProps as EchartsRoseChartProps,
    );
    expect((transformed.echartOptions.legend as any).show).toBe(false);
  });
});
