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

"""Tests for user deletion cascade handling in SupersetUserApi.pre_delete."""

# pylint: disable=invalid-name, unused-argument, redefined-outer-name

from unittest.mock import MagicMock

import pytest
from flask_appbuilder.security.sqla.models import Role, User
from pytest_mock import MockerFixture

from superset.extensions import appbuilder
from superset.security.manager import SupersetSecurityManager, SupersetUserApi


@pytest.fixture
def setup_user_deletion_test(app_context: None, mocker: MockerFixture):
    """
    Set up an in-memory database with all tables required for user deletion tests.
    Returns a dict with the session and created test objects.
    """
    from superset.connectors.sqla.models import SqlaTable
    from superset.key_value.models import KeyValueEntry
    from superset.models.core import FavStar, Log
    from superset.models.dashboard import Dashboard
    from superset.models.slice import Slice
    from superset.models.sql_lab import Query, SavedQuery, TabState
    from superset.models.user_attributes import UserAttribute
    from superset.tags.models import Tag, user_favorite_tag_table

    sm = SupersetSecurityManager(appbuilder)
    session = sm.session

    engine = session.get_bind()

    # Create all tables
    User.metadata.create_all(engine)

    return {
        "sm": sm,
        "session": session,
        "engine": engine,
        "models": {
            "SqlaTable": SqlaTable,
            "KeyValueEntry": KeyValueEntry,
            "FavStar": FavStar,
            "Log": Log,
            "Dashboard": Dashboard,
            "Slice": Slice,
            "Query": Query,
            "SavedQuery": SavedQuery,
            "TabState": TabState,
            "UserAttribute": UserAttribute,
            "Tag": Tag,
            "user_favorite_tag_table": user_favorite_tag_table,
        },
    }


def _create_test_user(
    session,
    username: str = "testuser",
    first_name: str = "Test",
    last_name: str = "User",
    email: str = "test@example.com",
    roles: list | None = None,
) -> User:
    """Helper to create a test user."""
    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        username=username,
        roles=roles or [],
    )
    session.add(user)
    session.flush()
    return user


def _create_appbuilder_mock(session):
    """Create a mock appbuilder that provides the session."""
    mock_appbuilder = MagicMock()
    mock_appbuilder.get_session = session
    return mock_appbuilder


def test_pre_delete_clears_roles(
    setup_user_deletion_test: dict,
) -> None:
    """Test that pre_delete clears user roles."""
    ctx = setup_user_deletion_test
    session = ctx["session"]

    role = Role(name="TestRole")
    session.add(role)
    session.flush()

    user = _create_test_user(session, roles=[role])
    assert len(user.roles) == 1

    api = SupersetUserApi()
    api.appbuilder = _create_appbuilder_mock(session)
    api.pre_delete(user)

    assert user.roles == []


def test_pre_delete_nullifies_created_by_fk_on_dashboards(
    setup_user_deletion_test: dict,
) -> None:
    """Test that pre_delete nullifies created_by_fk on dashboards."""
    ctx = setup_user_deletion_test
    session = ctx["session"]
    dashboard_cls = ctx["models"]["Dashboard"]

    user = _create_test_user(session)

    dashboard = dashboard_cls(
        dashboard_title="Test Dashboard",
        slug="test-dash",
        created_by_fk=user.id,
        changed_by_fk=user.id,
    )
    session.add(dashboard)
    session.flush()

    api = SupersetUserApi()
    api.appbuilder = _create_appbuilder_mock(session)
    api.pre_delete(user)

    session.refresh(dashboard)
    assert dashboard.created_by_fk is None
    assert dashboard.changed_by_fk is None


def test_pre_delete_nullifies_created_by_fk_on_slices(
    setup_user_deletion_test: dict,
) -> None:
    """Test that pre_delete nullifies created_by_fk and last_saved_by_fk on slices."""
    ctx = setup_user_deletion_test
    session = ctx["session"]
    slice_cls = ctx["models"]["Slice"]

    user = _create_test_user(session)

    slice_obj = slice_cls(
        slice_name="Test Slice",
        datasource_id=1,
        datasource_type="table",
        datasource_name="test_table",
        viz_type="table",
        created_by_fk=user.id,
        changed_by_fk=user.id,
        last_saved_by_fk=user.id,
    )
    session.add(slice_obj)
    session.flush()

    api = SupersetUserApi()
    api.appbuilder = _create_appbuilder_mock(session)
    api.pre_delete(user)

    session.refresh(slice_obj)
    assert slice_obj.created_by_fk is None
    assert slice_obj.changed_by_fk is None
    assert slice_obj.last_saved_by_fk is None


def test_pre_delete_nullifies_query_user_id(
    setup_user_deletion_test: dict,
) -> None:
    """Test that pre_delete nullifies user_id on queries (preserves history)."""
    ctx = setup_user_deletion_test
    session = ctx["session"]
    query_cls = ctx["models"]["Query"]

    from superset.models.core import Database

    user = _create_test_user(session)

    db_obj = Database(database_name="test_db", sqlalchemy_uri="sqlite://")
    session.add(db_obj)
    session.flush()

    query = query_cls(
        client_id="abc12345678",
        database_id=db_obj.id,
        user_id=user.id,
        sql="SELECT 1",
        tab_name="test",
    )
    session.add(query)
    session.flush()

    api = SupersetUserApi()
    api.appbuilder = _create_appbuilder_mock(session)
    api.pre_delete(user)

    session.refresh(query)
    assert query.user_id is None
    # Query record is preserved (not deleted)
    assert (
        session.query(query_cls).filter(query_cls.id == query.id).one_or_none()
        is not None
    )


def test_pre_delete_nullifies_log_user_id(
    setup_user_deletion_test: dict,
) -> None:
    """Test that pre_delete nullifies user_id on logs (preserves audit trail)."""
    ctx = setup_user_deletion_test
    session = ctx["session"]
    log_cls = ctx["models"]["Log"]

    user = _create_test_user(session)

    log = log_cls(action="test_action", user_id=user.id)
    session.add(log)
    session.flush()

    api = SupersetUserApi()
    api.appbuilder = _create_appbuilder_mock(session)
    api.pre_delete(user)

    session.refresh(log)
    assert log.user_id is None
    # Log record is preserved
    assert (
        session.query(log_cls).filter(log_cls.id == log.id).one_or_none()
        is not None
    )


def test_pre_delete_deletes_saved_queries(
    setup_user_deletion_test: dict,
) -> None:
    """Test that pre_delete deletes saved queries owned by the user."""
    ctx = setup_user_deletion_test
    session = ctx["session"]
    saved_query_cls = ctx["models"]["SavedQuery"]

    from superset.models.core import Database

    user = _create_test_user(session)

    db_obj = Database(database_name="test_db2", sqlalchemy_uri="sqlite://")
    session.add(db_obj)
    session.flush()

    saved_query = saved_query_cls(
        user_id=user.id,
        db_id=db_obj.id,
        label="Test Query",
        sql="SELECT 1",
    )
    session.add(saved_query)
    session.flush()
    saved_query_id = saved_query.id

    api = SupersetUserApi()
    api.appbuilder = _create_appbuilder_mock(session)
    api.pre_delete(user)

    assert (
        session.query(saved_query_cls)
        .filter(saved_query_cls.id == saved_query_id)
        .one_or_none()
        is None
    )


def test_pre_delete_deletes_tab_states(
    setup_user_deletion_test: dict,
) -> None:
    """Test that pre_delete deletes tab states owned by the user."""
    ctx = setup_user_deletion_test
    session = ctx["session"]
    tab_state_cls = ctx["models"]["TabState"]

    user = _create_test_user(session)

    tab_state = tab_state_cls(
        user_id=user.id,
        label="Test Tab",
    )
    session.add(tab_state)
    session.flush()
    tab_state_id = tab_state.id

    api = SupersetUserApi()
    api.appbuilder = _create_appbuilder_mock(session)
    api.pre_delete(user)

    assert (
        session.query(tab_state_cls)
        .filter(tab_state_cls.id == tab_state_id)
        .one_or_none()
        is None
    )


def test_pre_delete_deletes_favstars(
    setup_user_deletion_test: dict,
) -> None:
    """Test that pre_delete deletes user's favorite stars."""
    ctx = setup_user_deletion_test
    session = ctx["session"]
    fav_star_cls = ctx["models"]["FavStar"]

    user = _create_test_user(session)

    favstar = fav_star_cls(user_id=user.id, class_name="slice", obj_id=1)
    session.add(favstar)
    session.flush()
    favstar_id = favstar.id

    api = SupersetUserApi()
    api.appbuilder = _create_appbuilder_mock(session)
    api.pre_delete(user)

    assert (
        session.query(fav_star_cls)
        .filter(fav_star_cls.id == favstar_id)
        .one_or_none()
        is None
    )


def test_pre_delete_deletes_user_attributes(
    setup_user_deletion_test: dict,
) -> None:
    """Test that pre_delete deletes user attributes."""
    ctx = setup_user_deletion_test
    session = ctx["session"]
    user_attr_cls = ctx["models"]["UserAttribute"]

    user = _create_test_user(session)

    user_attr = user_attr_cls(
        user_id=user.id, avatar_url="http://example.com/avatar"
    )
    session.add(user_attr)
    session.flush()
    user_attr_id = user_attr.id

    api = SupersetUserApi()
    api.appbuilder = _create_appbuilder_mock(session)
    api.pre_delete(user)

    assert (
        session.query(user_attr_cls)
        .filter(user_attr_cls.id == user_attr_id)
        .one_or_none()
        is None
    )


def test_pre_delete_deletes_user_favorite_tags(
    setup_user_deletion_test: dict,
) -> None:
    """Test that pre_delete deletes user favorite tag associations."""
    ctx = setup_user_deletion_test
    session = ctx["session"]
    tag_cls = ctx["models"]["Tag"]
    user_favorite_tag_table = ctx["models"]["user_favorite_tag_table"]
    from superset.tags.models import TagType

    user = _create_test_user(session)

    tag = tag_cls(name="test_tag", type=TagType.custom)
    session.add(tag)
    session.flush()

    session.execute(
        user_favorite_tag_table.insert().values(user_id=user.id, tag_id=tag.id)
    )
    session.flush()

    # Verify the association exists
    result = session.execute(
        user_favorite_tag_table.select().where(
            user_favorite_tag_table.c.user_id == user.id
        )
    ).fetchall()
    assert len(result) == 1

    api = SupersetUserApi()
    api.appbuilder = _create_appbuilder_mock(session)
    api.pre_delete(user)

    result = session.execute(
        user_favorite_tag_table.select().where(
            user_favorite_tag_table.c.user_id == user.id
        )
    ).fetchall()
    assert len(result) == 0


def test_pre_delete_nullifies_key_value_fks(
    setup_user_deletion_test: dict,
) -> None:
    """Test pre_delete nullifies FKs on KeyValueEntry."""
    ctx = setup_user_deletion_test
    session = ctx["session"]
    kv_cls = ctx["models"]["KeyValueEntry"]

    user = _create_test_user(session)

    kv_entry = kv_cls(
        resource="test_resource",
        value=b"test_value",
        created_by_fk=user.id,
        changed_by_fk=user.id,
    )
    session.add(kv_entry)
    session.flush()

    api = SupersetUserApi()
    api.appbuilder = _create_appbuilder_mock(session)
    api.pre_delete(user)

    session.refresh(kv_entry)
    assert kv_entry.created_by_fk is None
    assert kv_entry.changed_by_fk is None


def test_pre_delete_with_all_associated_data(
    setup_user_deletion_test: dict,
) -> None:
    """
    Test that pre_delete successfully cleans up ALL types of associated data
    so the user can be deleted without FK constraint violations.
    """
    ctx = setup_user_deletion_test
    session = ctx["session"]
    dashboard_cls = ctx["models"]["Dashboard"]
    slice_cls = ctx["models"]["Slice"]
    fav_star_cls = ctx["models"]["FavStar"]
    log_cls = ctx["models"]["Log"]
    user_attr_cls = ctx["models"]["UserAttribute"]

    role = Role(name="Admin")
    session.add(role)
    session.flush()

    user = _create_test_user(session, username="fulluser", roles=[role])

    # Create dashboard created by user
    dashboard = dashboard_cls(
        dashboard_title="User Dashboard",
        slug="user-dash",
        created_by_fk=user.id,
        changed_by_fk=user.id,
    )
    session.add(dashboard)

    # Create slice created by user
    slice_obj = slice_cls(
        slice_name="User Slice",
        datasource_id=1,
        datasource_type="table",
        datasource_name="test",
        viz_type="table",
        created_by_fk=user.id,
        last_saved_by_fk=user.id,
    )
    session.add(slice_obj)

    # Create log entry
    log = log_cls(action="test", user_id=user.id)
    session.add(log)

    # Create favstar
    favstar = fav_star_cls(user_id=user.id, class_name="slice", obj_id=1)
    session.add(favstar)

    # Create user attribute
    user_attr = user_attr_cls(user_id=user.id)
    session.add(user_attr)
    session.flush()

    api = SupersetUserApi()
    api.appbuilder = _create_appbuilder_mock(session)
    api.pre_delete(user)

    # Verify roles cleared
    assert user.roles == []

    # Verify FKs nullified
    session.refresh(dashboard)
    assert dashboard.created_by_fk is None
    assert dashboard.changed_by_fk is None

    session.refresh(slice_obj)
    assert slice_obj.created_by_fk is None
    assert slice_obj.last_saved_by_fk is None

    session.refresh(log)
    assert log.user_id is None

    # Verify owned records deleted
    assert (
        session.query(fav_star_cls)
        .filter(fav_star_cls.user_id == user.id)
        .count()
        == 0
    )
    assert (
        session.query(user_attr_cls)
        .filter(user_attr_cls.user_id == user.id)
        .count()
        == 0
    )

    # Now the actual user deletion should succeed without FK violations
    session.delete(user)
    session.flush()
    assert session.query(User).filter(User.id == user.id).one_or_none() is None


def test_pre_delete_does_not_affect_other_users_data(
    setup_user_deletion_test: dict,
) -> None:
    """Test that pre_delete only affects the target user's data, not other users."""
    ctx = setup_user_deletion_test
    session = ctx["session"]
    dashboard_cls = ctx["models"]["Dashboard"]
    fav_star_cls = ctx["models"]["FavStar"]
    log_cls = ctx["models"]["Log"]

    user_to_delete = _create_test_user(
        session, username="delete_me", email="delete@example.com"
    )
    other_user = _create_test_user(
        session, username="keep_me", email="keep@example.com"
    )

    # Create data for both users
    dash_delete = dashboard_cls(
        dashboard_title="Delete User Dash",
        slug="del-dash",
        created_by_fk=user_to_delete.id,
    )
    dash_keep = dashboard_cls(
        dashboard_title="Keep User Dash",
        slug="keep-dash",
        created_by_fk=other_user.id,
    )
    session.add_all([dash_delete, dash_keep])

    log_delete = log_cls(action="delete_action", user_id=user_to_delete.id)
    log_keep = log_cls(action="keep_action", user_id=other_user.id)
    session.add_all([log_delete, log_keep])

    fav_delete = fav_star_cls(
        user_id=user_to_delete.id, class_name="slice", obj_id=1
    )
    fav_keep = fav_star_cls(
        user_id=other_user.id, class_name="slice", obj_id=1
    )
    session.add_all([fav_delete, fav_keep])
    session.flush()

    api = SupersetUserApi()
    api.appbuilder = _create_appbuilder_mock(session)
    api.pre_delete(user_to_delete)

    # Deleted user's dashboard FK nullified
    session.refresh(dash_delete)
    assert dash_delete.created_by_fk is None

    # Other user's dashboard FK preserved
    session.refresh(dash_keep)
    assert dash_keep.created_by_fk == other_user.id

    # Deleted user's log FK nullified
    session.refresh(log_delete)
    assert log_delete.user_id is None

    # Other user's log FK preserved
    session.refresh(log_keep)
    assert log_keep.user_id == other_user.id

    # Deleted user's favstar removed
    assert (
        session.query(fav_star_cls)
        .filter(fav_star_cls.user_id == user_to_delete.id)
        .count()
        == 0
    )

    # Other user's favstar preserved
    assert (
        session.query(fav_star_cls)
        .filter(fav_star_cls.user_id == other_user.id)
        .count()
        == 1
    )


def test_pre_delete_admin_user_with_data(
    setup_user_deletion_test: dict,
) -> None:
    """Test that an admin user with associated data can be cleaned up for deletion."""
    ctx = setup_user_deletion_test
    session = ctx["session"]
    dashboard_cls = ctx["models"]["Dashboard"]

    admin_role = Role(name="AdminRole")
    session.add(admin_role)
    session.flush()

    admin_user = _create_test_user(
        session,
        username="admin_to_delete",
        email="admin@example.com",
        roles=[admin_role],
    )

    dashboard = dashboard_cls(
        dashboard_title="Admin Dashboard",
        slug="admin-dash",
        created_by_fk=admin_user.id,
        changed_by_fk=admin_user.id,
    )
    session.add(dashboard)
    session.flush()

    api = SupersetUserApi()
    api.appbuilder = _create_appbuilder_mock(session)
    api.pre_delete(admin_user)

    # Roles cleared
    assert admin_user.roles == []

    # Dashboard FKs nullified
    session.refresh(dashboard)
    assert dashboard.created_by_fk is None
    assert dashboard.changed_by_fk is None

    # Admin user can now be deleted
    session.delete(admin_user)
    session.flush()
    assert (
        session.query(User).filter(User.id == admin_user.id).one_or_none() is None
    )


def test_pre_delete_user_with_no_associated_data(
    setup_user_deletion_test: dict,
) -> None:
    """Test that pre_delete works correctly for a user with no associated data."""
    ctx = setup_user_deletion_test
    session = ctx["session"]

    user = _create_test_user(
        session, username="lonely_user", email="lonely@example.com"
    )

    api = SupersetUserApi()
    api.appbuilder = _create_appbuilder_mock(session)

    # Should not raise any exceptions
    api.pre_delete(user)

    assert user.roles == []

    # User can be deleted
    session.delete(user)
    session.flush()
    assert session.query(User).filter(User.id == user.id).one_or_none() is None


def test_pre_delete_user_with_multiple_roles(
    setup_user_deletion_test: dict,
) -> None:
    """Test that pre_delete clears all roles from a user with multiple roles."""
    ctx = setup_user_deletion_test
    session = ctx["session"]

    role1 = Role(name="Role1")
    role2 = Role(name="Role2")
    role3 = Role(name="Role3")
    session.add_all([role1, role2, role3])
    session.flush()

    user = _create_test_user(
        session,
        username="multi_role",
        email="multi@example.com",
        roles=[role1, role2, role3],
    )
    assert len(user.roles) == 3

    api = SupersetUserApi()
    api.appbuilder = _create_appbuilder_mock(session)
    api.pre_delete(user)

    assert user.roles == []
    # Roles themselves still exist
    assert session.query(Role).filter(Role.name == "Role1").one_or_none() is not None
    assert session.query(Role).filter(Role.name == "Role2").one_or_none() is not None
    assert session.query(Role).filter(Role.name == "Role3").one_or_none() is not None


def test_pre_delete_preserves_dashboard_record(
    setup_user_deletion_test: dict,
) -> None:
    """
    Test that pre_delete nullifies user references on dashboards but
    does NOT delete the dashboard itself.
    """
    ctx = setup_user_deletion_test
    session = ctx["session"]
    dashboard_cls = ctx["models"]["Dashboard"]

    user = _create_test_user(
        session, username="dash_owner", email="dash@example.com"
    )

    dashboard = dashboard_cls(
        dashboard_title="Important Dashboard",
        slug="important-dash",
        created_by_fk=user.id,
        changed_by_fk=user.id,
    )
    session.add(dashboard)
    session.flush()
    dashboard_id = dashboard.id

    api = SupersetUserApi()
    api.appbuilder = _create_appbuilder_mock(session)
    api.pre_delete(user)

    # Dashboard still exists
    preserved = (
        session.query(dashboard_cls)
        .filter(dashboard_cls.id == dashboard_id)
        .one_or_none()
    )
    assert preserved is not None
    assert preserved.dashboard_title == "Important Dashboard"
    assert preserved.created_by_fk is None


def test_pre_delete_preserves_query_history(
    setup_user_deletion_test: dict,
) -> None:
    """
    Test that pre_delete nullifies user references on queries but
    preserves the query history records.
    """
    ctx = setup_user_deletion_test
    session = ctx["session"]
    query_cls = ctx["models"]["Query"]

    from superset.models.core import Database

    user = _create_test_user(
        session, username="query_user", email="query@example.com"
    )

    db_obj = Database(database_name="test_db_hist", sqlalchemy_uri="sqlite://")
    session.add(db_obj)
    session.flush()

    queries = []
    for i in range(3):
        q = query_cls(
            client_id=f"hist{i:09d}",
            database_id=db_obj.id,
            user_id=user.id,
            sql=f"SELECT {i}",
            tab_name=f"tab_{i}",
        )
        session.add(q)
        queries.append(q)
    session.flush()

    api = SupersetUserApi()
    api.appbuilder = _create_appbuilder_mock(session)
    api.pre_delete(user)

    # All 3 queries still exist but user_id is null
    remaining = (
        session.query(query_cls).filter(query_cls.database_id == db_obj.id).all()
    )
    assert len(remaining) == 3
    for q in remaining:
        assert q.user_id is None
