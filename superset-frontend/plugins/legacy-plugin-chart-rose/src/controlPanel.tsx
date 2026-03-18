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
import { t } from '@apache-superset/core/translation';
import {
  ControlPanelConfig,
  ControlPanelsContainerProps,
  ControlSubSectionHeader,
  D3_FORMAT_DOCS,
  D3_FORMAT_OPTIONS,
  D3_TIME_FORMAT_OPTIONS,
  getStandardizedControls,
  sharedControls,
} from '@superset-ui/chart-controls';
import { DEFAULT_FORM_DATA } from './types';

const {
  innerRadius,
  labelsOutside,
  labelType,
  labelLine,
  outerRadius,
  numberFormat,
  showLabels,
  useAreaProportions,
  richTooltip,
} = DEFAULT_FORM_DATA;

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        ['groupby'],
        ['metric'],
        ['adhoc_filters'],
        ['row_limit'],
        [
          {
            name: 'sort_by_metric',
            config: {
              ...sharedControls.sort_by_metric,
              default: true,
            },
          },
        ],
      ],
    },
    {
      label: t('Chart Options'),
      expanded: true,
      controlSetRows: [
        ['color_scheme'],
        [
          {
            name: 'use_area_proportions',
            config: {
              type: 'CheckboxControl',
              label: t('Use Area Proportions'),
              description: t(
                'Check if the Rose Chart should use area proportions ' +
                  'instead of radius proportions',
              ),
              default: useAreaProportions,
              renderTrigger: true,
            },
          },
        ],
        [<ControlSubSectionHeader>{t('Legend')}</ControlSubSectionHeader>],
        [
          {
            name: 'show_legend',
            config: {
              type: 'CheckboxControl',
              label: t('Show legend'),
              renderTrigger: true,
              default: true,
              description: t('Whether to display a legend for the chart'),
            },
          },
        ],
        [
          {
            name: 'legendType',
            config: {
              type: 'SelectControl',
              freeForm: false,
              label: t('Type'),
              choices: [
                ['scroll', t('Scroll')],
                ['plain', t('List')],
              ],
              default: 'scroll',
              renderTrigger: true,
              description: t('Legend type'),
              visibility: ({ controls }: ControlPanelsContainerProps) =>
                Boolean(controls?.show_legend?.value),
            },
          },
        ],
        [
          {
            name: 'legendOrientation',
            config: {
              type: 'SelectControl',
              freeForm: false,
              label: t('Orientation'),
              choices: [
                ['top', t('Top')],
                ['bottom', t('Bottom')],
                ['left', t('Left')],
                ['right', t('Right')],
              ],
              default: 'top',
              renderTrigger: true,
              description: t('Legend Orientation'),
              visibility: ({ controls }: ControlPanelsContainerProps) =>
                Boolean(controls?.show_legend?.value),
            },
          },
        ],
        [
          {
            name: 'legendMargin',
            config: {
              type: 'TextControl',
              label: t('Margin'),
              renderTrigger: true,
              isInt: true,
              default: null,
              description: t('Additional padding for legend.'),
              visibility: ({ controls }: ControlPanelsContainerProps) =>
                Boolean(controls?.show_legend?.value),
            },
          },
        ],
        [<ControlSubSectionHeader>{t('Labels')}</ControlSubSectionHeader>],
        [
          {
            name: 'label_type',
            config: {
              type: 'SelectControl',
              label: t('Label Type'),
              default: labelType,
              renderTrigger: true,
              choices: [
                ['key', t('Category Name')],
                ['value', t('Value')],
                ['percent', t('Percentage')],
                ['key_value', t('Category and Value')],
                ['key_percent', t('Category and Percentage')],
                ['key_value_percent', t('Category, Value and Percentage')],
              ],
              description: t('What should be shown on the label?'),
            },
          },
        ],
        [
          {
            name: 'number_format',
            config: {
              type: 'SelectControl',
              freeForm: true,
              label: t('Number format'),
              renderTrigger: true,
              default: numberFormat,
              choices: D3_FORMAT_OPTIONS,
              description: D3_FORMAT_DOCS,
            },
          },
        ],
        [
          {
            name: 'date_format',
            config: {
              type: 'SelectControl',
              freeForm: true,
              label: t('Date format'),
              renderTrigger: true,
              choices: D3_TIME_FORMAT_OPTIONS,
              default: 'smart_date',
              description: D3_FORMAT_DOCS,
            },
          },
        ],
        [
          {
            name: 'show_labels',
            config: {
              type: 'CheckboxControl',
              label: t('Show Labels'),
              renderTrigger: true,
              default: showLabels,
              description: t('Whether to display the labels.'),
            },
          },
        ],
        [
          {
            name: 'labels_outside',
            config: {
              type: 'CheckboxControl',
              label: t('Put labels outside'),
              default: labelsOutside,
              renderTrigger: true,
              description: t('Put the labels outside of the pie?'),
              visibility: ({ controls }: ControlPanelsContainerProps) =>
                Boolean(controls?.show_labels?.value),
            },
          },
        ],
        [
          {
            name: 'label_line',
            config: {
              type: 'CheckboxControl',
              label: t('Label Line'),
              default: labelLine,
              renderTrigger: true,
              description: t(
                'Draw line from Pie to label when labels outside?',
              ),
              visibility: ({ controls }: ControlPanelsContainerProps) =>
                Boolean(controls?.show_labels?.value),
            },
          },
        ],
        [<ControlSubSectionHeader>{t('Tooltip')}</ControlSubSectionHeader>],
        [
          {
            name: 'rich_tooltip',
            config: {
              type: 'CheckboxControl',
              label: t('Rich Tooltip'),
              renderTrigger: true,
              default: richTooltip,
              description: t(
                'The rich tooltip shows a list of all series for that point in time',
              ),
            },
          },
        ],
        [<ControlSubSectionHeader>{t('Rose shape')}</ControlSubSectionHeader>],
        [
          {
            name: 'outerRadius',
            config: {
              type: 'SliderControl',
              label: t('Outer Radius'),
              renderTrigger: true,
              min: 10,
              max: 100,
              step: 1,
              default: outerRadius,
              description: t('Outer edge of Rose chart'),
            },
          },
        ],
        [
          {
            name: 'is_donut',
            config: {
              type: 'CheckboxControl',
              label: t('Donut'),
              default: false,
              renderTrigger: true,
              description: t('Do you want a donut or a filled rose?'),
            },
          },
        ],
        [
          {
            name: 'innerRadius',
            config: {
              type: 'SliderControl',
              label: t('Inner Radius'),
              renderTrigger: true,
              min: 0,
              max: 100,
              step: 1,
              default: innerRadius,
              description: t('Inner radius of donut hole'),
              visibility: ({ controls }: ControlPanelsContainerProps) =>
                Boolean(controls?.is_donut?.value),
            },
          },
        ],
      ],
    },
  ],
  controlOverrides: {
    row_limit: {
      default: 100,
    },
  },
  formDataOverrides: formData => ({
    ...formData,
    metric: getStandardizedControls().shiftMetric(),
    groupby: getStandardizedControls().popAllColumns(),
  }),
};

export default config;
