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

from collections.abc import Iterator
from typing import Any
from unittest.mock import MagicMock, PropertyMock

import pytest
from flask import g
from pytest_mock import MockerFixture
from sqlalchemy import inspect
from sqlalchemy.orm.session import Session

from superset.app import SupersetApp
from superset.dashboards.schemas import DashboardGetResponseSchema


@pytest.fixture
def mock_dashboard() -> MagicMock:
    dash = MagicMock()
    dash.id = 1
    dash.slug = "test-slug"
    dash.url = "/superset/dashboard/test-slug/"
    dash.dashboard_title = "Test Dashboard"
    dash.thumbnail_url = "http://example.com/thumb.png"
    dash.published = True
    dash.css = ""
    dash.theme = None
    dash.json_metadata = "{}"
    dash.position_json = "{}"
    dash.certified_by = None
    dash.certification_details = None
    dash.changed_by_name = "admin"
    dash.changed_by = MagicMock(id=1, first_name="admin", last_name="user")
    dash.changed_on = None
    dash.changed_on_humanized = "2 days ago"
    dash.created_by = MagicMock(id=1, first_name="admin", last_name="user")
    dash.created_on_humanized = "5 days ago"
    dash.charts = []
    dash.owners = []
    dash.roles = []
    dash.tags = []
    dash.custom_tags = []
    dash.is_managed_externally = False
    dash.uuid = None
    return dash


def test_schema_column_selection_excludes_thumbnail(
    mock_dashboard: MagicMock,
) -> None:
    schema = DashboardGetResponseSchema(only=["id", "dashboard_title"])
    result = schema.dump(mock_dashboard)
    assert "id" in result
    assert "dashboard_title" in result
    assert "thumbnail_url" not in result
    assert "slug" not in result


def test_schema_column_selection_with_data_key(
    mock_dashboard: MagicMock,
) -> None:
    """Fields with data_key should work when using the internal field name."""
    schema = DashboardGetResponseSchema(only=["id", "changed_on_humanized"])
    result = schema.dump(mock_dashboard)
    assert "id" in result
    assert "changed_on_delta_humanized" in result
    assert "dashboard_title" not in result


def test_schema_full_response_includes_thumbnail(
    mock_dashboard: MagicMock,
) -> None:
    schema = DashboardGetResponseSchema()
    result = schema.dump(mock_dashboard)
    assert "thumbnail_url" in result
    assert "id" in result
    assert "dashboard_title" in result


def test_data_key_mapping_logic() -> None:
    """The key_to_name mapping used in the API correctly maps data_key to field name."""
    schema = DashboardGetResponseSchema()
    key_to_name = {
        field.data_key or name: name for name, field in schema.fields.items()
    }
    # changed_on_delta_humanized is the data_key for changed_on_humanized
    assert key_to_name["changed_on_delta_humanized"] == "changed_on_humanized"
    assert key_to_name["created_on_delta_humanized"] == "created_on_humanized"
    # fields without data_key map to themselves
    assert key_to_name["id"] == "id"
    assert key_to_name["thumbnail_url"] == "thumbnail_url"


@pytest.fixture
def session_with_dashboards(
    session: Session, mocker: MockerFixture
) -> Iterator[Session]:
    from superset.connectors.sqla.models import SqlaTable
    from superset.models.core import Database
    from superset.models.dashboard import Dashboard
    from superset.models.slice import Slice

    engine = session.get_bind()
    Dashboard.metadata.create_all(engine)  # pylint: disable=no-member

    database = Database(database_name="db", sqlalchemy_uri="sqlite://")
    table = SqlaTable(table_name="t", database=database)
    for i in range(1, 4):
        chart = Slice(
            slice_name=f"chart {i}",
            datasource_type="table",
            table=table,
        )
        session.add(
            Dashboard(
                dashboard_title=f"dashboard {i}",
                position_json="{}",
                css="",
                json_metadata="{}",
                slices=[chart],
            )
        )
    session.commit()
    session.expunge_all()
    mocker.patch(
        "flask_appbuilder.models.sqla.interface.SQLAInterface.session",
        new_callable=PropertyMock,
        return_value=session,
    )
    yield session
    session.rollback()


def _unloaded_digest_inputs(dashboard: Any) -> set[str]:
    return inspect(dashboard).unloaded & {
        "position_json",
        "css",
        "json_metadata",
        "slices",
    }


def test_list_query_prefetches_thumbnail_digest_inputs(
    session_with_dashboards: Session,
    app: SupersetApp,
) -> None:
    """The list query batch-loads what the thumbnail digest reads."""
    from superset.dashboards.api import DashboardRestApi

    with app.test_request_context():
        count, dashboards = DashboardRestApi.datamodel.query(
            select_columns=["id", "thumbnail_url"]
        )

    assert count == 3
    for dashboard in dashboards:
        assert _unloaded_digest_inputs(dashboard) == set()
        assert "table" not in inspect(dashboard.slices[0]).unloaded


def test_list_query_skips_prefetch_without_thumbnail_url(
    session_with_dashboards: Session,
    app: SupersetApp,
) -> None:
    """No extra queries when the response omits ``thumbnail_url``."""
    from superset.dashboards.api import (
        DashboardRestApi,
        PREFETCH_THUMBNAIL_INPUTS_KEY,
    )

    with app.test_request_context():
        _, dashboards = DashboardRestApi.datamodel.query(
            select_columns=["id", "dashboard_title"]
        )
        assert all(_unloaded_digest_inputs(d) for d in dashboards)

        setattr(g, PREFETCH_THUMBNAIL_INPUTS_KEY, False)
        _, dashboards = DashboardRestApi.datamodel.query(
            select_columns=["id", "thumbnail_url"]
        )
        assert all(_unloaded_digest_inputs(d) for d in dashboards)
