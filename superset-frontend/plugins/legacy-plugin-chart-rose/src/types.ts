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
  ChartDataResponseResult,
  ChartProps,
  QueryFormColumn,
  QueryFormData,
} from '@superset-ui/core';
import {
  BaseTransformedProps,
  CrossFilterTransformedProps,
  LegendOrientation,
  LegendType,
  Refs,
} from '@superset-ui/plugin-chart-echarts';

export { LegendOrientation, LegendType };
export type { Refs };

export type EchartsRoseFormData = QueryFormData & {
  colorScheme?: string;
  groupby: QueryFormColumn[];
  metric?: string;
  numberFormat: string;
  dateFormat: string;
  showLabels: boolean;
  labelsOutside: boolean;
  labelLine: boolean;
  labelType: EchartsRoseLabelType;
  outerRadius: number;
  innerRadius: number;
  isDonut: boolean;
  useAreaProportions: boolean;
  richTooltip: boolean;
  showLegend: boolean;
  legendOrientation: LegendOrientation;
  legendType: LegendType;
  legendMargin: number | null | string;
  legendSort: 'asc' | 'desc' | null;
  sliceId?: number;
};

export enum EchartsRoseLabelType {
  Key = 'key',
  Value = 'value',
  Percent = 'percent',
  KeyValue = 'key_value',
  KeyPercent = 'key_percent',
  KeyValuePercent = 'key_value_percent',
}

export interface EchartsRoseChartProps extends ChartProps<EchartsRoseFormData> {
  formData: EchartsRoseFormData;
  queriesData: ChartDataResponseResult[];
}

export type RoseChartTransformedProps = BaseTransformedProps<EchartsRoseFormData> &
  CrossFilterTransformedProps;

// @ts-expect-error - partial form data for defaults
export const DEFAULT_FORM_DATA: EchartsRoseFormData = {
  groupby: [],
  innerRadius: 30,
  isDonut: false,
  labelLine: false,
  labelType: EchartsRoseLabelType.Key,
  legendOrientation: LegendOrientation.Top,
  legendType: LegendType.Scroll,
  legendMargin: null,
  legendSort: null,
  showLegend: true,
  numberFormat: 'SMART_NUMBER',
  dateFormat: 'smart_date',
  outerRadius: 70,
  showLabels: true,
  labelsOutside: true,
  useAreaProportions: false,
  richTooltip: true,
};
