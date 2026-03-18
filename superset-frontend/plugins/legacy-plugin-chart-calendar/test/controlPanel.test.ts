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

import type {
  ControlPanelConfig,
  CustomControlItem,
} from '@superset-ui/chart-controls';
import controlPanel from '../src/controlPanel';

type ControlConfig = Required<CustomControlItem['config']>;

function isCustomControlItem(
  controlItem: unknown,
): controlItem is CustomControlItem & { config: ControlConfig } {
  return (
    typeof controlItem === 'object' &&
    controlItem !== null &&
    'name' in controlItem &&
    'config' in controlItem
  );
}

function getControl(
  panel: ControlPanelConfig,
  controlName: string,
): CustomControlItem & { config: ControlConfig } {
  const item = (panel.controlPanelSections || [])
    .flatMap(section => section?.controlSetRows || [])
    .flat()
    .find(
      controlItem =>
        isCustomControlItem(controlItem) && controlItem.name === controlName,
    );

  if (!isCustomControlItem(item)) {
    throw new Error(`Control "${controlName}" not found`);
  }

  return item;
}

describe('controlPanel', () => {
  describe('sections', () => {
    test('has three control panel sections', () => {
      expect(controlPanel.controlPanelSections).toHaveLength(3);
    });

    test('first section is Time', () => {
      const section = controlPanel.controlPanelSections![0];
      expect(section.label).toBeDefined();
      expect(section.expanded).toBe(true);
    });

    test('second section is Query', () => {
      const section = controlPanel.controlPanelSections![1];
      expect(section.label).toBeDefined();
      expect(section.expanded).toBe(true);
    });

    test('third section is Chart Options', () => {
      const section = controlPanel.controlPanelSections![2];
      expect(section.label).toBeDefined();
      expect(section.expanded).toBe(true);
      expect(section.tabOverride).toBe('customize');
    });

    test('Time section has granularity_sqla and time_range controls', () => {
      const section = controlPanel.controlPanelSections![0];
      const controlNames = section.controlSetRows!.flat();
      expect(controlNames).toContain('granularity_sqla');
      expect(controlNames).toContain('time_range');
    });

    test('Query section has metrics and adhoc_filters', () => {
      const section = controlPanel.controlPanelSections![1];
      const flatRows = section.controlSetRows!.flat();
      expect(flatRows).toContain('metrics');
      expect(flatRows).toContain('adhoc_filters');
    });
  });

  describe('domain_granularity control', () => {
    test('has correct default value', () => {
      const control = getControl(controlPanel, 'domain_granularity');
      expect(control.config.default).toBe('month');
    });

    test('is a SelectControl', () => {
      const control = getControl(controlPanel, 'domain_granularity');
      expect(control.config.type).toBe('SelectControl');
    });

    test('has five choices', () => {
      const control = getControl(controlPanel, 'domain_granularity');
      expect(control.config.choices).toHaveLength(5);
    });

    test('choices include hour, day, week, month, year', () => {
      const control = getControl(controlPanel, 'domain_granularity');
      const choiceValues = (control.config.choices as [string, string][]).map(
        c => c[0],
      );
      expect(choiceValues).toEqual(['hour', 'day', 'week', 'month', 'year']);
    });
  });

  describe('subdomain_granularity control', () => {
    test('has correct default value', () => {
      const control = getControl(controlPanel, 'subdomain_granularity');
      expect(control.config.default).toBe('day');
    });

    test('is a SelectControl', () => {
      const control = getControl(controlPanel, 'subdomain_granularity');
      expect(control.config.type).toBe('SelectControl');
    });

    test('has five choices', () => {
      const control = getControl(controlPanel, 'subdomain_granularity');
      expect(control.config.choices).toHaveLength(5);
    });

    test('choices include min, hour, day, week, month', () => {
      const control = getControl(controlPanel, 'subdomain_granularity');
      const choiceValues = (control.config.choices as [string, string][]).map(
        c => c[0],
      );
      expect(choiceValues).toEqual(['min', 'hour', 'day', 'week', 'month']);
    });
  });

  describe('cell_size control', () => {
    test('has correct default value', () => {
      const control = getControl(controlPanel, 'cell_size');
      expect(control.config.default).toBe(10);
    });

    test('is a TextControl', () => {
      const control = getControl(controlPanel, 'cell_size');
      expect(control.config.type).toBe('TextControl');
    });

    test('is marked as integer', () => {
      const control = getControl(controlPanel, 'cell_size');
      expect(control.config.isInt).toBe(true);
    });

    test('has renderTrigger enabled', () => {
      const control = getControl(controlPanel, 'cell_size');
      expect(control.config.renderTrigger).toBe(true);
    });

    test('has validators', () => {
      const control = getControl(controlPanel, 'cell_size');
      expect(control.config.validators).toHaveLength(1);
    });
  });

  describe('cell_padding control', () => {
    test('has correct default value', () => {
      const control = getControl(controlPanel, 'cell_padding');
      expect(control.config.default).toBe(2);
    });

    test('is a TextControl with integer validation', () => {
      const control = getControl(controlPanel, 'cell_padding');
      expect(control.config.type).toBe('TextControl');
      expect(control.config.isInt).toBe(true);
    });

    test('has renderTrigger enabled', () => {
      const control = getControl(controlPanel, 'cell_padding');
      expect(control.config.renderTrigger).toBe(true);
    });
  });

  describe('cell_radius control', () => {
    test('has correct default value', () => {
      const control = getControl(controlPanel, 'cell_radius');
      expect(control.config.default).toBe(0);
    });

    test('is a TextControl with integer validation', () => {
      const control = getControl(controlPanel, 'cell_radius');
      expect(control.config.type).toBe('TextControl');
      expect(control.config.isInt).toBe(true);
    });
  });

  describe('steps control', () => {
    test('has correct default value', () => {
      const control = getControl(controlPanel, 'steps');
      expect(control.config.default).toBe(10);
    });

    test('is a TextControl with integer validation', () => {
      const control = getControl(controlPanel, 'steps');
      expect(control.config.type).toBe('TextControl');
      expect(control.config.isInt).toBe(true);
    });

    test('has renderTrigger enabled', () => {
      const control = getControl(controlPanel, 'steps');
      expect(control.config.renderTrigger).toBe(true);
    });
  });

  describe('x_axis_time_format control', () => {
    test('has correct default value', () => {
      const control = getControl(controlPanel, 'x_axis_time_format');
      expect(control.config.default).toBe('smart_date');
    });

    test('is a SelectControl with freeForm', () => {
      const control = getControl(controlPanel, 'x_axis_time_format');
      expect(control.config.type).toBe('SelectControl');
      expect(control.config.freeForm).toBe(true);
    });

    test('has renderTrigger enabled', () => {
      const control = getControl(controlPanel, 'x_axis_time_format');
      expect(control.config.renderTrigger).toBe(true);
    });
  });

  describe('show_legend control', () => {
    test('has correct default value', () => {
      const control = getControl(controlPanel, 'show_legend');
      expect(control.config.default).toBe(true);
    });

    test('is a CheckboxControl', () => {
      const control = getControl(controlPanel, 'show_legend');
      expect(control.config.type).toBe('CheckboxControl');
    });

    test('has renderTrigger enabled', () => {
      const control = getControl(controlPanel, 'show_legend');
      expect(control.config.renderTrigger).toBe(true);
    });
  });

  describe('show_values control', () => {
    test('has correct default value', () => {
      const control = getControl(controlPanel, 'show_values');
      expect(control.config.default).toBe(false);
    });

    test('is a CheckboxControl', () => {
      const control = getControl(controlPanel, 'show_values');
      expect(control.config.type).toBe('CheckboxControl');
    });
  });

  describe('show_metric_name control', () => {
    test('has correct default value', () => {
      const control = getControl(controlPanel, 'show_metric_name');
      expect(control.config.default).toBe(true);
    });

    test('is a CheckboxControl', () => {
      const control = getControl(controlPanel, 'show_metric_name');
      expect(control.config.type).toBe('CheckboxControl');
    });
  });

  describe('controlOverrides', () => {
    test('overrides y_axis_format label', () => {
      expect(controlPanel.controlOverrides).toBeDefined();
      expect(controlPanel.controlOverrides!.y_axis_format).toBeDefined();
      expect(controlPanel.controlOverrides!.y_axis_format.label).toBeDefined();
    });
  });

  describe('formDataOverrides', () => {
    test('is defined', () => {
      expect(controlPanel.formDataOverrides).toBeDefined();
      expect(typeof controlPanel.formDataOverrides).toBe('function');
    });

    test('spreads formData and adds metrics', () => {
      const mockFormData = {
        cellSize: 10,
        showLegend: true,
      };
      const result = controlPanel.formDataOverrides!(mockFormData as any);
      expect(result.cellSize).toBe(10);
      expect(result.showLegend).toBe(true);
      expect('metrics' in result).toBe(true);
    });
  });
});
