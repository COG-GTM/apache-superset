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

from typing import Any, Iterator

import pytest
from flask import current_app
from pytest_mock import MockerFixture

from superset.common.query_rate_limit import enforce_datasource_query_rate_limit
from superset.exceptions import SupersetRateLimitExceededException


@pytest.fixture
def rate_limit_cache(mocker: MockerFixture) -> dict[str, Any]:
    """In-memory stand-in for the counter cache backing the rate limit."""
    store: dict[str, Any] = {}
    cache = mocker.patch("superset.common.query_rate_limit.cache_manager").cache
    cache.get.side_effect = store.get
    cache.set.side_effect = lambda key, value, timeout: store.__setitem__(key, value)
    return store


@pytest.fixture
def enabled_rate_limit() -> Iterator[None]:
    original = current_app.config["DATASOURCE_QUERY_RATE_LIMIT"]
    current_app.config["DATASOURCE_QUERY_RATE_LIMIT"] = {
        "enabled": True,
        "max_queries": 2,
        "period_seconds": 60,
    }
    yield
    current_app.config["DATASOURCE_QUERY_RATE_LIMIT"] = original


def test_allows_queries_within_budget(
    rate_limit_cache: dict[str, Any],
    enabled_rate_limit: None,
) -> None:
    enforce_datasource_query_rate_limit("table__1")
    enforce_datasource_query_rate_limit("table__1")

    assert list(rate_limit_cache.values()) == [2]


def test_throttles_queries_over_budget(
    rate_limit_cache: dict[str, Any],
    enabled_rate_limit: None,
) -> None:
    enforce_datasource_query_rate_limit("table__1")
    enforce_datasource_query_rate_limit("table__1")

    with pytest.raises(SupersetRateLimitExceededException) as excinfo:
        enforce_datasource_query_rate_limit("table__1")

    assert excinfo.value.status == 429
    assert excinfo.value.error.extra["datasource_uid"] == "table__1"
    # the rejected query is not billed against the next window
    assert list(rate_limit_cache.values()) == [2]


def test_budget_is_per_datasource(
    rate_limit_cache: dict[str, Any],
    enabled_rate_limit: None,
) -> None:
    enforce_datasource_query_rate_limit("table__1")
    enforce_datasource_query_rate_limit("table__1")
    enforce_datasource_query_rate_limit("table__2")

    assert sorted(rate_limit_cache.values()) == [1, 2]


def test_disabled_by_default(rate_limit_cache: dict[str, Any]) -> None:
    for _ in range(100):
        enforce_datasource_query_rate_limit("table__1")

    assert rate_limit_cache == {}


def test_datasource_query_is_throttled(
    rate_limit_cache: dict[str, Any],
    enabled_rate_limit: None,
    mocker: MockerFixture,
) -> None:
    from superset.models.helpers import ExploreMixin

    datasource = mocker.MagicMock()
    datasource.uid = "table__1"

    ExploreMixin.query(datasource, {})
    ExploreMixin.query(datasource, {})
    assert datasource.database.get_df.call_count == 2

    with pytest.raises(SupersetRateLimitExceededException):
        ExploreMixin.query(datasource, {})

    assert datasource.database.get_df.call_count == 2
