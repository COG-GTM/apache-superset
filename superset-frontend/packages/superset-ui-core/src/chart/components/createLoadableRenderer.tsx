/*
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

import { Component, ComponentClass, ComponentType, ReactNode } from 'react';

export type LoadableRendererProps = {
  onRenderFailure?: Function;
  onRenderSuccess?: Function;
};

export type LoadingComponentProps = {
  error?: any;
  isLoading?: boolean;
  pastDelay?: boolean;
};

export interface OptionsWithMap<Props, Exports extends Record<string, any>> {
  loader: { [P in keyof Exports]: () => Promise<Exports[P]> };
  loading: ComponentType<LoadingComponentProps>;
  render: (loaded: Exports, props: Props & LoadableRendererProps) => ReactNode;
}

const defaultProps = {
  onRenderFailure() {},
  onRenderSuccess() {},
};

export interface LoadableRenderer<Props> extends ComponentClass<
  Props & LoadableRendererProps
> {
  preload: () => void;
}

type LoadableState<Exports> = {
  loaded?: Exports;
  loading: boolean;
  error?: Error | null;
};

// react-loadable resolved ES modules by unwrapping the `default` export.
function resolveModule<T>(module: T): T {
  return module && (module as { __esModule?: boolean }).__esModule
    ? (module as unknown as { default: T }).default
    : module;
}

export default function createLoadableRenderer<
  Props,
  Exports extends Record<string, any>,
>(options: OptionsWithMap<Props, Exports>): LoadableRenderer<Props> {
  const { loader, loading: Loading, render } = options;
  const keys = Object.keys(loader) as (keyof Exports)[];

  let promise: Promise<Exports> | undefined;

  function loadAll(): Promise<Exports> {
    if (!promise) {
      promise = Promise.all(
        keys.map(key =>
          Promise.resolve()
            .then(() => loader[key]())
            .then(module => resolveModule(module)),
        ),
      ).then(values => {
        const loaded = {} as Exports;
        keys.forEach((key, index) => {
          loaded[key] = values[index];
        });
        return loaded;
      });
    }

    return promise;
  }

  class CustomLoadableRenderer extends Component<
    Props & LoadableRendererProps,
    LoadableState<Exports>
  > {
    static defaultProps = defaultProps;

    static preload() {
      loadAll();
    }

    private mounted = false;

    constructor(props: Props & LoadableRendererProps) {
      super(props);
      this.state = { loaded: undefined, loading: true, error: null };
    }

    componentDidMount() {
      this.mounted = true;
      loadAll()
        .then(loaded => {
          if (this.mounted) {
            this.setState({ loaded, loading: false, error: null });
          }
        })
        .catch(error => {
          if (this.mounted) {
            this.setState({ loading: false, error });
          }
        });
      this.afterRender();
    }

    componentDidUpdate() {
      this.afterRender();
    }

    componentWillUnmount() {
      this.mounted = false;
    }

    afterRender() {
      const { loaded, loading, error } = this.state;
      const { onRenderFailure, onRenderSuccess } = this.props;
      if (!loading) {
        if (error) {
          (onRenderFailure as Function)(error);
        } else if (loaded && Object.keys(loaded).length > 0) {
          (onRenderSuccess as Function)();
        }
      }
    }

    render() {
      const { loaded, loading, error } = this.state;
      if (loading || error) {
        return <Loading error={error} isLoading={loading} pastDelay />;
      }
      if (loaded) {
        return render(loaded, this.props);
      }
      return null;
    }
  }

  return CustomLoadableRenderer as unknown as LoadableRenderer<Props>;
}
