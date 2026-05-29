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
import React, { Component, type CSSProperties, type ReactNode } from 'react';
import { IconTooltip, List } from '@superset-ui/core/components';
import { nanoid } from 'nanoid';
import { t } from '@apache-superset/core/translation';
import { withTheme, type SupersetTheme } from '@apache-superset/core/theme';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icons } from '@superset-ui/core/components/Icons';
import {
  HeaderContainer,
  AddIconButton,
} from 'src/explore/components/controls/OptionControls';
import ControlHeader from 'src/explore/components/ControlHeader';
import CustomListItem from 'src/explore/components/controls/CustomListItem';
import controlMap from '..';

interface CollectionItem {
  key?: string;
  [key: string]: unknown;
}

interface CollectionControlProps {
  name: string;
  label?: string | null;
  description?: string | null;
  placeholder?: string;
  addTooltip?: string;
  itemGenerator?: () => CollectionItem;
  keyAccessor?: (item: CollectionItem) => string;
  onChange?: (value: CollectionItem[]) => void;
  value?: CollectionItem[];
  isFloat?: boolean;
  isInt?: boolean;
  controlName: string;
  theme: SupersetTheme;
}

const defaultProps: Partial<CollectionControlProps> = {
  label: null,
  description: null,
  onChange: () => {},
  placeholder: t('Empty collection'),
  itemGenerator: () => ({ key: nanoid(11) }),
  keyAccessor: (o: CollectionItem) => o.key ?? '',
  value: [],
  addTooltip: t('Add an item'),
};
function SortableList({
  ids,
  onSortEnd,
  children,
}: {
  ids: string[];
  onSortEnd: (oldIndex: number, newIndex: number) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex !== -1 && newIndex !== -1) {
      onSortEnd(oldIndex, newIndex);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <List
          bordered
          css={(theme: SupersetTheme) => ({
            borderRadius: theme.borderRadius,
          })}
        >
          {children}
        </List>
      </SortableContext>
    </DndContext>
  );
}

function SortableListItem({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // lockAxis="y": ignore horizontal translation while dragging.
  const style: CSSProperties = {
    transform: CSS.Transform.toString(
      transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : transform,
    ),
    transition: transition || undefined,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <CustomListItem
      ref={setNodeRef}
      style={style}
      selectable={false}
      className="clearfix"
      css={(theme: SupersetTheme) => ({
        alignItems: 'center',
        justifyContent: 'flex-start',
        display: 'flex',
        paddingInline: theme.sizeUnit * 6,
      })}
    >
      <span
        {...attributes}
        {...listeners}
        css={{ display: 'inline-flex', cursor: 'ns-resize' }}
      >
        <Icons.MenuOutlined
          role="img"
          aria-label={t('Drag to reorder')}
          className="text-primary"
        />
      </span>
      {children}
    </CustomListItem>
  );
}

class CollectionControl extends Component<CollectionControlProps> {
  static defaultProps = defaultProps;

  constructor(props: CollectionControlProps) {
    super(props);
    this.onAdd = this.onAdd.bind(this);
  }

  onChange(i: number, value: CollectionItem) {
    const currentValue = this.props.value ?? [];
    const newValue = [...currentValue];
    newValue[i] = { ...currentValue[i], ...value };
    this.props.onChange?.(newValue);
  }

  onAdd() {
    const currentValue = this.props.value ?? [];
    const newItem = this.props.itemGenerator?.();
    // Cast needed: original JS allowed undefined items from itemGenerator
    this.props.onChange?.(
      currentValue.concat([newItem] as unknown as CollectionItem[]),
    );
  }

  onSortEnd(oldIndex: number, newIndex: number) {
    const currentValue = this.props.value ?? [];
    this.props.onChange?.(arrayMove(currentValue, oldIndex, newIndex));
  }

  removeItem(i: number) {
    const currentValue = this.props.value ?? [];
    this.props.onChange?.(currentValue.filter((o, ix) => i !== ix));
  }

  renderList() {
    const currentValue = this.props.value ?? [];
    if (currentValue.length === 0) {
      return <div className="text-muted">{this.props.placeholder}</div>;
    }
    const Control = (controlMap as Record<string, React.ComponentType<any>>)[
      this.props.controlName
    ];
    const keyAccessor =
      this.props.keyAccessor ?? ((o: CollectionItem) => o.key ?? '');
    const ids = currentValue.map(
      (o: CollectionItem, i: number) => keyAccessor(o) || String(i),
    );
    return (
      <SortableList ids={ids} onSortEnd={this.onSortEnd.bind(this)}>
        {currentValue.map((o: CollectionItem, i: number) => {
          // label relevant only for header, not here
          const { label, theme, ...commonProps } = this.props;
          return (
            <SortableListItem key={ids[i]} id={ids[i]}>
              <div
                css={(theme: SupersetTheme) => ({
                  flex: 1,
                  marginLeft: theme.sizeUnit * 2,
                  marginRight: theme.sizeUnit * 2,
                })}
              >
                <Control
                  {...commonProps}
                  {...o}
                  onChange={this.onChange.bind(this, i)}
                />
              </div>
              <IconTooltip
                className="pointer"
                placement="right"
                onClick={this.removeItem.bind(this, i)}
                tooltip={t('Remove item')}
                mouseEnterDelay={0}
                mouseLeaveDelay={0}
                css={(theme: SupersetTheme) => ({
                  padding: 0,
                  minWidth: 'auto',
                  height: 'auto',
                  lineHeight: 1,
                  cursor: 'pointer',
                  '& svg path': {
                    fill: theme.colorIcon,
                    transition: `fill ${theme.motionDurationMid} ease-out`,
                  },
                  '&:hover svg path': {
                    fill: theme.colorError,
                  },
                })}
              >
                <Icons.CloseOutlined iconSize="s" />
              </IconTooltip>
            </SortableListItem>
          );
        })}
      </SortableList>
    );
  }

  render() {
    return (
      <div data-test="CollectionControl" className="CollectionControl">
        <HeaderContainer>
          <ControlHeader {...this.props} />
          <AddIconButton onClick={this.onAdd}>
            <Icons.PlusOutlined
              iconSize="s"
              iconColor={this.props.theme.colorTextLightSolid}
            />
          </AddIconButton>
        </HeaderContainer>
        {this.renderList()}
      </div>
    );
  }
}

export default withTheme(CollectionControl);
