# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

import pytest
from werkzeug.exceptions import NotFound

from superset.app import SupersetApp


@pytest.mark.parametrize(
    "filename",
    [
        "../../../etc/passwd",
        "..%2F..%2Fetc%2Fpasswd/../../../etc/passwd",
        "/etc/passwd",
        "../superset_config.py.hot-update.json",
    ],
)
def test_send_static_file_rejects_traversal(app: SupersetApp, filename: str) -> None:
    """
    Paths escaping the static folder are rejected, including hot-update paths.
    """
    with pytest.raises(NotFound):
        app.send_static_file(filename)
