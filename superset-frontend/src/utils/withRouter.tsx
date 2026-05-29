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
import { ComponentType } from 'react';
import {
  useNavigate,
  useLocation,
  useParams,
  NavigateFunction,
  Location,
  Params,
} from 'react-router-dom';

export interface RouterProps {
  navigate: NavigateFunction;
  location: Location;
  params: Params;
}

/**
 * Compatibility shim for class components that relied on react-router v5's
 * `withRouter` HOC. Injects `navigate`, `location`, and `params` as props.
 */
export default function withRouter<P extends RouterProps>(
  WrappedComponent: ComponentType<P>,
) {
  function WithRouterWrapper(props: Omit<P, keyof RouterProps>) {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    return (
      <WrappedComponent
        {...(props as P)}
        navigate={navigate}
        location={location}
        params={params}
      />
    );
  }

  const wrappedName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component';
  WithRouterWrapper.displayName = `withRouter(${wrappedName})`;

  return WithRouterWrapper;
}
