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
from __future__ import annotations

import logging
import time

from flask import current_app
from flask_babel import gettext as _

from superset.exceptions import SupersetRateLimitExceededException
from superset.extensions import cache_manager

logger = logging.getLogger(__name__)

CACHE_KEY_PREFIX = "datasource-query-rate-limit"


def enforce_datasource_query_rate_limit(datasource_uid: str) -> None:
    """
    Register a query against a datasource's rate limit budget.

    The budget is a fixed window counter stored in the general purpose cache, keyed
    by datasource and window, and expiring with the window. The counter is read and
    written without a lock, so under concurrency the effective limit can slightly
    exceed the configured one.

    :param datasource_uid: The uid of the datasource being queried
    :raises SupersetRateLimitExceededException: If the datasource is over budget
    """
    config = current_app.config["DATASOURCE_QUERY_RATE_LIMIT"]
    if not config.get("enabled"):
        return

    max_queries = config["max_queries"]
    period_seconds = config["period_seconds"]

    window = int(time.time()) // period_seconds
    key = f"{CACHE_KEY_PREFIX}:{datasource_uid}:{window}"
    count = cache_manager.cache.get(key) or 0

    if count >= max_queries:
        logger.warning(
            "Query rate limit of %d queries per %ds reached for datasource %s",
            max_queries,
            period_seconds,
            datasource_uid,
        )
        raise SupersetRateLimitExceededException(
            _(
                "Query rate limit exceeded for this datasource: at most "
                "%(max_queries)d queries every %(period_seconds)d seconds are "
                "allowed. Please try again later.",
                max_queries=max_queries,
                period_seconds=period_seconds,
            ),
            extra={
                "datasource_uid": datasource_uid,
                "max_queries": max_queries,
                "period_seconds": period_seconds,
            },
        )

    cache_manager.cache.set(key, count + 1, timeout=period_seconds)
