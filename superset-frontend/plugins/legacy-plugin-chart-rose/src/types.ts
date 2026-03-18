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
  SetDataMaskHook,
  ContextMenuFilters,
  FilterState,
} from '@superset-ui/core';
import type { EChartsCoreOption } from 'echarts/core';
import { RefObject, Ref } from 'react';

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

export enum LegendOrientation {
  Top = 'top',
  Bottom = 'bottom',
  Left = 'left',
  Right = 'right',
}

export enum LegendType {
  Scroll = 'scroll',
  Plain = 'plain',
}

export interface EchartsRoseChartProps extends ChartProps<EchartsRoseFormData> {
  formData: EchartsRoseFormData;
  queriesData: ChartDataResponseResult[];
}

export interface EchartsHandler {
  getEchartInstance: () => unknown;
}

export type Refs = {
  echartRef?: Ref<EchartsHandler>;
  divRef?: RefObject<HTMLDivElement>;
};

export type EventHandlers = Record<string, { (props: unknown): void }>;

export interface RoseChartTransformedProps {
  echartOptions: EChartsCoreOption;
  formData: EchartsRoseFormData;
  height: number;
  width: number;
  setDataMask?: SetDataMaskHook;
  labelMap: Record<string, string[]>;
  groupby: QueryFormColumn[];
  selectedValues: Record<number, string>;
  onContextMenu?: (
    clientX: number,
    clientY: number,
    filters?: ContextMenuFilters,
  ) => void;
  refs: Refs;
  emitCrossFilters?: boolean;
  coltypeMapping?: Record<string, number>;
}

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
