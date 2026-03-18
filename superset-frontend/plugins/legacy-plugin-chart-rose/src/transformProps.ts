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
  CategoricalColorNamespace,
  getColumnLabel,
  getMetricLabel,
  getNumberFormatter,
  getTimeFormatter,
  NumberFormats,
  ValueFormatter,
  DataRecord,
  tooltipHtml,
} from '@superset-ui/core';
import type { CallbackDataParams } from 'echarts/types/src/util/types';
import type { EChartsCoreOption } from 'echarts/core';
import type { PieSeriesOption } from 'echarts/charts';
/* eslint-disable import/no-unresolved */
import {
  extractGroupbyLabel,
  getColtypesMapping,
  getLegendProps,
  getChartPadding,
  sanitizeHtml,
} from '@superset-ui/plugin-chart-echarts/utils/series';
/* eslint-enable import/no-unresolved */
import {
  DEFAULT_FORM_DATA,
  EchartsRoseChartProps,
  EchartsRoseFormData,
  EchartsRoseLabelType,
  RoseChartTransformedProps,
  Refs,
} from './types';
import { OpacityEnum } from './constants';

const percentFormatter = getNumberFormatter(NumberFormats.PERCENT_2_POINT);

export function parseParams({
  params,
  numberFormatter,
  sanitizeName = false,
}: {
  params: Pick<CallbackDataParams, 'name' | 'value' | 'percent'>;
  numberFormatter: ValueFormatter;
  sanitizeName?: boolean;
}): string[] {
  const { name: rawName = '', value, percent } = params;
  const name = sanitizeName ? sanitizeHtml(rawName) : rawName;
  const formattedValue = numberFormatter(value as number);
  const formattedPercent = percentFormatter((percent as number) / 100);
  return [name, formattedValue, formattedPercent];
}

export default function transformProps(
  chartProps: EchartsRoseChartProps,
): RoseChartTransformedProps {
  const {
    formData,
    height,
    hooks,
    filterState,
    queriesData,
    width,
    theme,
    inContextMenu,
    emitCrossFilters,
  } = chartProps;
  const { data: rawData = [] } = queriesData[0];
  const coltypeMapping = getColtypesMapping(queriesData[0] as any);

  const {
    colorScheme,
    groupby,
    innerRadius,
    isDonut,
    labelsOutside,
    labelLine,
    labelType,
    legendMargin,
    legendOrientation,
    legendType,
    legendSort,
    metric = '',
    numberFormat,
    dateFormat,
    outerRadius,
    showLabels,
    showLegend,
    useAreaProportions,
    richTooltip,
    sliceId,
  }: EchartsRoseFormData = {
    ...DEFAULT_FORM_DATA,
    ...formData,
  };

  const refs: Refs = {};
  const metricLabel = getMetricLabel(metric);
  const groupbyLabels = groupby.map(getColumnLabel);

  const numberFormatter = getNumberFormatter(numberFormat);

  const labelMap = rawData.reduce(
    (acc: Record<string, string[]>, datum: DataRecord) => {
      const label = extractGroupbyLabel({
        datum,
        groupby: groupbyLabels,
        coltypeMapping,
        timeFormatter: getTimeFormatter(dateFormat),
      });
      return {
        ...acc,
        [label]: groupbyLabels.map(col => datum[col] as string),
      };
    },
    {},
  );

  const { setDataMask = () => {}, onContextMenu } = hooks;
  const colorFn = CategoricalColorNamespace.getScale(colorScheme as string);

  const transformedData: PieSeriesOption[] = rawData.map(
    (datum: DataRecord) => {
      const name = extractGroupbyLabel({
        datum,
        groupby: groupbyLabels,
        coltypeMapping,
        timeFormatter: getTimeFormatter(dateFormat),
      });
      const isFiltered =
        filterState.selectedValues &&
        !filterState.selectedValues.includes(name);
      const value = datum[metricLabel];

      return {
        value,
        name,
        itemStyle: {
          color: colorFn(name, sliceId),
          opacity: isFiltered
            ? OpacityEnum.SemiTransparent
            : OpacityEnum.NonTransparent,
        },
      };
    },
  );

  const selectedValues = (filterState.selectedValues || []).reduce(
    (acc: Record<number, string>, selectedValue: string) => {
      const index = transformedData.findIndex(
        ({ name }) => name === selectedValue,
      );
      return {
        ...acc,
        [index]: selectedValue,
      };
    },
    {},
  );

  const formatter = (params: CallbackDataParams) => {
    const [name, formattedValue, formattedPercent] = parseParams({
      params,
      numberFormatter,
    });
    switch (labelType) {
      case EchartsRoseLabelType.Key:
        return name;
      case EchartsRoseLabelType.Value:
        return formattedValue;
      case EchartsRoseLabelType.Percent:
        return formattedPercent;
      case EchartsRoseLabelType.KeyValue:
        return `${name}: ${formattedValue}`;
      case EchartsRoseLabelType.KeyValuePercent:
        return `${name}: ${formattedValue} (${formattedPercent})`;
      case EchartsRoseLabelType.KeyPercent:
        return `${name}: ${formattedPercent}`;
      default:
        return name;
    }
  };

  const defaultLabel = {
    formatter,
    show: showLabels,
    color: theme.colorText,
  };

  const chartPadding = getChartPadding(
    showLegend,
    legendOrientation,
    legendMargin,
  );

  const series: PieSeriesOption[] = [
    {
      type: 'pie',
      ...chartPadding,
      animation: false,
      roseType: useAreaProportions ? 'area' : 'radius',
      radius: [`${isDonut ? innerRadius : 0}%`, `${outerRadius}%`],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      labelLine: labelsOutside && labelLine ? { show: true } : { show: false },
      label: labelsOutside
        ? {
            ...defaultLabel,
            position: 'outer',
            alignTo: 'none',
            bleedMargin: 5,
          }
        : {
            ...defaultLabel,
            position: 'inner',
          },
      emphasis: {
        label: {
          show: true,
          fontWeight: 'bold',
          backgroundColor: theme.colorBgLayout,
        },
      },
      data: transformedData,
    },
  ];

  const echartOptions: EChartsCoreOption = {
    grid: {
      containLabel: true,
    },
    tooltip: {
      show: !inContextMenu,
      trigger: 'item',
      appendToBody: true,
      borderColor: 'transparent',
      className: 'echarts-tooltip',
      formatter: (params: CallbackDataParams) => {
        const [name, formattedValue, formattedPercent] = parseParams({
          params,
          numberFormatter,
          sanitizeName: true,
        });
        if (richTooltip) {
          return tooltipHtml(
            [[metricLabel, formattedValue, formattedPercent]],
            name,
          );
        }
        return tooltipHtml([[metricLabel, formattedValue]], name);
      },
    },
    legend: {
      ...getLegendProps(legendType, legendOrientation, showLegend, theme),
      data: transformedData
        .map(datum => datum.name as string)
        .sort((a: string, b: string) => {
          if (!legendSort) return 0;
          return legendSort === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
        }),
    },
    series,
  };

  return {
    formData,
    width,
    height,
    echartOptions,
    setDataMask,
    labelMap,
    groupby,
    selectedValues,
    onContextMenu,
    refs,
    emitCrossFilters,
    coltypeMapping,
  };
}
