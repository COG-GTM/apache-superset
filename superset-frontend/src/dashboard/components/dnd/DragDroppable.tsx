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
import { getEmptyImage } from 'react-dnd-html5-backend';
import { CSSProperties, PureComponent, ReactNode, useRef } from 'react';
import { TAB_TYPE } from 'src/dashboard/util/componentTypes';
import {
  useDrag,
  useDrop,
  ConnectDragSource,
  ConnectDragPreview,
  ConnectDropTarget,
  DragSourceMonitor,
  DropTargetMonitor,
} from 'react-dnd';
import cx from 'classnames';
import { css, styled } from '@apache-superset/core/theme';

import { dragConfig, dropConfig } from './dragDroppableConfig';
import type {
  DragDroppableProps as BaseDragDroppableProps,
  DragItem,
} from './dragDroppableConfig';
import { DROP_FORBIDDEN } from '../../util/getDropPosition';
import type { ComponentType } from '../../types';

interface DropIndicatorProps {
  className: string;
}

interface ChildProps {
  dragSourceRef?: ConnectDragSource;
  dropIndicatorProps: DropIndicatorProps | null;
  draggingTabOnTab?: boolean;
  'data-test': string;
}

interface DragDroppableOwnProps extends BaseDragDroppableProps {
  children: (childProps: ChildProps) => ReactNode;
  className?: string | null;
  style?: CSSProperties | null;
  onDropIndicatorChange?: (info: {
    dropIndicator: string | null;
    isDraggingOver: boolean;
    index: number;
  }) => void;
  onDragTab?: (dragComponentId: string | undefined) => void;
  editMode?: boolean;
  useEmptyDragPreview?: boolean;
}

interface DragDroppableDndProps {
  isDragging: boolean;
  isDraggingOver: boolean;
  isDraggingOverShallow: boolean;
  dragComponentType?: ComponentType;
  dragComponentId?: string;
  droppableRef: ConnectDropTarget;
  dragSourceRef: ConnectDragSource;
  dragPreviewRef: ConnectDragPreview;
}

type DragDroppableAllProps = DragDroppableOwnProps & DragDroppableDndProps;

interface DragDroppableState {
  dropIndicator: string | null;
}

const DragDroppableStyles = styled.div`
  ${({ theme }) => css`
    position: relative;

    &.dragdroppable--dragging {
      opacity: 0.2;
    }

    &.dragdroppable-row {
      width: 100%;
    }
    /* workaround to avoid a bug in react-dnd where the drag
      preview expands outside of the bounds of the drag source card, see:
      https://github.com/react-dnd/react-dnd/issues/832 */
    &.dragdroppable-column {
      /* for chrome */
      transform: translate3d(0, 0, 0);
      /* for safari */
      backface-visibility: hidden;
    }

    &.dragdroppable-column .resizable-container span div {
      z-index: 10;
    }

    & {
      .drop-indicator {
        display: block;
        background-color: ${theme.colorPrimary};
        position: absolute;
        z-index: 10;
        opacity: 0.3;
        width: 100%;
        height: 100%;
        &.drop-indicator--forbidden {
          background-color: ${theme.colorErrorBg};
        }
      }
    }
  `};
`;
// export unwrapped component for testing
export class UnwrappedDragDroppable extends PureComponent<
  DragDroppableAllProps,
  DragDroppableState
> {
  mounted: boolean;

  ref: HTMLDivElement | null;

  static defaultProps = {
    className: null,
    style: null,
    parentComponent: undefined,
    disableDragDrop: false,
    dropToChild: false,
    children() {},
    onDrop() {},
    onHover() {},
    onDropIndicatorChange() {},
    onDragTab() {},
    orientation: 'row' as const,
    useEmptyDragPreview: false,
    isDragging: false,
    isDraggingOver: false,
    isDraggingOverShallow: false,
    droppableRef() {},
    dragSourceRef() {},
    dragPreviewRef() {},
  };

  constructor(props: DragDroppableAllProps) {
    super(props);
    this.state = {
      dropIndicator: null, // this gets set/modified by the react-dnd HOCs
    };
    this.mounted = false;
    this.ref = null;
    this.setRef = this.setRef.bind(this);
  }

  componentDidMount(): void {
    this.mounted = true;
  }

  componentWillUnmount(): void {
    this.mounted = false;
  }

  componentDidUpdate(
    prevProps: DragDroppableAllProps,
    prevState: DragDroppableState,
  ): void {
    const {
      onDropIndicatorChange,
      isDraggingOver,
      component,
      index,
      dragComponentId,
      onDragTab,
    } = this.props;
    const { dropIndicator } = this.state;
    const isTabsType = component.type === TAB_TYPE;
    const validStateChange =
      dropIndicator !== prevState.dropIndicator ||
      isDraggingOver !== prevProps.isDraggingOver ||
      index !== prevProps.index;

    if (onDropIndicatorChange && isTabsType && validStateChange) {
      onDropIndicatorChange({ dropIndicator, isDraggingOver, index });
    }

    if (dragComponentId !== prevProps.dragComponentId) {
      setTimeout(() => {
        /**
         * This timeout ensures the dargSourceRef and dragPreviewRef are set
         * before the component is removed in Tabs.jsx. Otherwise react-dnd
         * will not render the drag preview.
         */
        onDragTab?.(dragComponentId);
      });
    }
  }

  setRef(ref: HTMLDivElement | null): void {
    this.ref = ref;
    // this is needed for a custom drag preview
    if (this.props.useEmptyDragPreview) {
      this.props.dragPreviewRef(getEmptyImage(), {
        // IE fallback: specify that we'd rather screenshot the node
        // when it already knows it's being dragged so we can hide it with CSS.
        captureDraggingState: true,
      });
    } else {
      this.props.dragPreviewRef(ref);
    }
    this.props.droppableRef?.(ref);
  }

  render(): ReactNode {
    const {
      children,
      className,
      orientation,
      dragSourceRef,
      disableDragDrop,
      isDragging,
      isDraggingOver,
      style,
      editMode,
      component,
      dragComponentType,
    } = this.props;

    const { dropIndicator } = this.state;
    const dropIndicatorProps: DropIndicatorProps | null =
      isDraggingOver && dropIndicator && !disableDragDrop
        ? {
            className: cx(
              'drop-indicator',
              dropIndicator === DROP_FORBIDDEN && 'drop-indicator--forbidden',
            ),
          }
        : null;

    const draggingTabOnTab =
      component.type === TAB_TYPE && dragComponentType === TAB_TYPE;

    const childProps: ChildProps = editMode
      ? {
          dragSourceRef,
          dropIndicatorProps,
          draggingTabOnTab,
          'data-test': 'dragdroppable-content',
        }
      : {
          dropIndicatorProps: null,
          'data-test': 'dragdroppable-content',
        };

    return (
      <DragDroppableStyles
        style={style ?? undefined}
        ref={this.setRef}
        data-test="dragdroppable-object"
        className={cx(
          'dragdroppable',
          editMode && 'dragdroppable--edit-mode',
          orientation === 'row' && 'dragdroppable-row',
          orientation === 'column' && 'dragdroppable-column',
          isDragging && 'dragdroppable--dragging',
          className,
        )}
      >
        {children(childProps)}
      </DragDroppableStyles>
    );
  }
}

// The legacy react-dnd decorator HOCs (DragSource/DropTarget) erased the public
// prop types of these wrappers by casting the wrapped component to
// `Record<string, unknown>`, so consumers pass loosely-typed props. Preserve
// that external contract to keep this a behavior-only migration;
// `UnwrappedDragDroppable` remains strongly typed for internal use and tests.
type DragDroppablePublicProps = Record<string, unknown>;

const withDefaults = (props: DragDroppablePublicProps): DragDroppableOwnProps =>
  ({
    disableDragDrop: false,
    ...props,
  }) as unknown as DragDroppableOwnProps;

const collectDrag = (monitor: DragSourceMonitor) => ({
  isDragging: monitor.isDragging(),
  dragComponentType: (monitor.getItem() as DragItem | null)?.type,
  dragComponentId: (monitor.getItem() as DragItem | null)?.id,
});

const collectDrop = (monitor: DropTargetMonitor) => ({
  isDraggingOver: monitor.isOver(),
  isDraggingOverShallow: monitor.isOver({ shallow: true }),
});

function useDragSpec(props: DragDroppableOwnProps) {
  return useDrag({
    type: dragConfig[0],
    canDrag: () => dragConfig[1].canDrag(props),
    item: () => dragConfig[1].beginDrag(props),
    collect: collectDrag,
  });
}

function useDropSpec(
  props: DragDroppableOwnProps,
  componentRef: { current: UnwrappedDragDroppable | null },
) {
  return useDrop({
    accept: dropConfig[0],
    canDrop: () => dropConfig[1].canDrop(props),
    hover: (_item: DragItem, monitor: DropTargetMonitor) => {
      const component = componentRef.current;
      if (component) {
        dropConfig[1].hover(props, monitor, component);
      }
    },
    drop: (_item: DragItem, monitor: DropTargetMonitor) => {
      const component = componentRef.current;
      return component
        ? dropConfig[1].drop(props, monitor, component)
        : undefined;
    },
    collect: collectDrop,
  });
}

export function Draggable(rawProps: DragDroppablePublicProps) {
  const props = withDefaults(rawProps);
  const componentRef = useRef<UnwrappedDragDroppable>(null);
  const [
    { isDragging, dragComponentType, dragComponentId },
    dragSourceRef,
    dragPreviewRef,
  ] = useDragSpec(props);
  return (
    <UnwrappedDragDroppable
      ref={componentRef}
      {...props}
      isDragging={isDragging}
      dragComponentType={dragComponentType}
      dragComponentId={dragComponentId}
      dragSourceRef={dragSourceRef}
      dragPreviewRef={dragPreviewRef}
    />
  );
}

export function Droppable(rawProps: DragDroppablePublicProps) {
  const props = withDefaults(rawProps);
  const componentRef = useRef<UnwrappedDragDroppable>(null);
  const [{ isDraggingOver, isDraggingOverShallow }, droppableRef] = useDropSpec(
    props,
    componentRef,
  );
  return (
    <UnwrappedDragDroppable
      ref={componentRef}
      {...props}
      isDraggingOver={isDraggingOver}
      isDraggingOverShallow={isDraggingOverShallow}
      droppableRef={droppableRef}
    />
  );
}

export function DragDroppable(rawProps: DragDroppablePublicProps) {
  const props = withDefaults(rawProps);
  const componentRef = useRef<UnwrappedDragDroppable>(null);
  const [
    { isDragging, dragComponentType, dragComponentId },
    dragSourceRef,
    dragPreviewRef,
  ] = useDragSpec(props);
  const [{ isDraggingOver, isDraggingOverShallow }, droppableRef] = useDropSpec(
    props,
    componentRef,
  );
  return (
    <UnwrappedDragDroppable
      ref={componentRef}
      {...props}
      isDragging={isDragging}
      dragComponentType={dragComponentType}
      dragComponentId={dragComponentId}
      dragSourceRef={dragSourceRef}
      dragPreviewRef={dragPreviewRef}
      isDraggingOver={isDraggingOver}
      isDraggingOverShallow={isDraggingOverShallow}
      droppableRef={droppableRef}
    />
  );
}
