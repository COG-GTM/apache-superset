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

"""
Security-focused tests for database connector modules.

These tests verify that SQL injection vulnerabilities have been resolved
in the MySQL, PostgreSQL, and Oracle engine specs.
"""

from unittest.mock import Mock, patch

import pytest
from pytest_mock import MockerFixture  # noqa: F401

# ---------------------------------------------------------------------------
# Helper validation function tests
# ---------------------------------------------------------------------------


class TestValidateIntId:
    """Tests for validate_int_id – used by cancel_query in MySQL and Postgres."""

    def test_valid_integer_string(self) -> None:
        from superset.db_engine_specs.lib import validate_int_id

        assert validate_int_id("123") == 123

    def test_valid_integer(self) -> None:
        from superset.db_engine_specs.lib import validate_int_id

        assert validate_int_id(42) == 42

    def test_rejects_sql_injection_payload(self) -> None:
        from superset.db_engine_specs.lib import validate_int_id

        with pytest.raises(ValueError, match="invalid literal"):
            validate_int_id("1; DROP TABLE users; --")

    def test_rejects_string_with_quotes(self) -> None:
        from superset.db_engine_specs.lib import validate_int_id

        with pytest.raises(ValueError, match="invalid literal"):
            validate_int_id("1' OR '1'='1")

    def test_rejects_empty_string(self) -> None:
        from superset.db_engine_specs.lib import validate_int_id

        with pytest.raises(ValueError, match="invalid literal"):
            validate_int_id("")

    def test_rejects_float_string(self) -> None:
        from superset.db_engine_specs.lib import validate_int_id

        with pytest.raises(ValueError, match="invalid literal"):
            validate_int_id("3.14")

    def test_negative_integer(self) -> None:
        from superset.db_engine_specs.lib import validate_int_id

        assert validate_int_id("-1") == -1


class TestValidateSqlIdentifier:
    """Tests for validate_sql_identifier – used by get_prequeries in Postgres."""

    def test_valid_simple_identifier(self) -> None:
        from superset.db_engine_specs.lib import validate_sql_identifier

        assert validate_sql_identifier("my_schema") == "my_schema"

    def test_valid_dotted_identifier(self) -> None:
        from superset.db_engine_specs.lib import validate_sql_identifier

        assert validate_sql_identifier("public.my_table") == "public.my_table"

    def test_valid_identifier_with_dollar(self) -> None:
        from superset.db_engine_specs.lib import validate_sql_identifier

        assert validate_sql_identifier("pg$temp") == "pg$temp"

    def test_rejects_sql_injection_with_semicolon(self) -> None:
        from superset.db_engine_specs.lib import validate_sql_identifier

        with pytest.raises(ValueError, match="Invalid SQL identifier"):
            validate_sql_identifier('"; DROP TABLE users; --')

    def test_rejects_double_quote_breakout(self) -> None:
        from superset.db_engine_specs.lib import validate_sql_identifier

        with pytest.raises(ValueError, match="Invalid SQL identifier"):
            validate_sql_identifier('" ; SELECT 1; --')

    def test_rejects_single_quote(self) -> None:
        from superset.db_engine_specs.lib import validate_sql_identifier

        with pytest.raises(ValueError, match="Invalid SQL identifier"):
            validate_sql_identifier("schema' OR '1'='1")

    def test_rejects_empty_string(self) -> None:
        from superset.db_engine_specs.lib import validate_sql_identifier

        with pytest.raises(ValueError, match="Invalid SQL identifier"):
            validate_sql_identifier("")

    def test_rejects_spaces(self) -> None:
        from superset.db_engine_specs.lib import validate_sql_identifier

        with pytest.raises(ValueError, match="Invalid SQL identifier"):
            validate_sql_identifier("my schema")

    def test_rejects_parentheses(self) -> None:
        from superset.db_engine_specs.lib import validate_sql_identifier

        with pytest.raises(ValueError, match="Invalid SQL identifier"):
            validate_sql_identifier("schema(); --")


# ---------------------------------------------------------------------------
# MySQL cancel_query – SQL injection prevention
# ---------------------------------------------------------------------------


class TestMySQLCancelQuerySecurity:
    """Verify that MySQL cancel_query uses parameterized queries."""

    @patch("sqlalchemy.engine.Engine.connect")
    def test_cancel_query_uses_parameterized_query(
        self, engine_mock: Mock
    ) -> None:
        from superset.db_engine_specs.mysql import MySQLEngineSpec
        from superset.models.sql_lab import Query

        query = Query()
        cursor_mock = engine_mock.return_value.__enter__.return_value
        assert MySQLEngineSpec.cancel_query(cursor_mock, query, "123") is True
        cursor_mock.execute.assert_called_once_with(
            "KILL CONNECTION %s", (123,)
        )

    @patch("sqlalchemy.engine.Engine.connect")
    def test_cancel_query_rejects_sql_injection(
        self, engine_mock: Mock
    ) -> None:
        from superset.db_engine_specs.mysql import MySQLEngineSpec
        from superset.models.sql_lab import Query

        query = Query()
        cursor_mock = engine_mock.return_value.__enter__.return_value
        # Malicious cancel_query_id should be rejected (returns False
        # because validate_int_id raises ValueError, caught by except)
        result = MySQLEngineSpec.cancel_query(
            cursor_mock, query, "1; DROP TABLE users; --"
        )
        assert result is False
        cursor_mock.execute.assert_not_called()

    @patch("sqlalchemy.engine.Engine.connect")
    def test_cancel_query_rejects_quote_injection(
        self, engine_mock: Mock
    ) -> None:
        from superset.db_engine_specs.mysql import MySQLEngineSpec
        from superset.models.sql_lab import Query

        query = Query()
        cursor_mock = engine_mock.return_value.__enter__.return_value
        result = MySQLEngineSpec.cancel_query(
            cursor_mock, query, "1' OR '1'='1"
        )
        assert result is False
        cursor_mock.execute.assert_not_called()


# ---------------------------------------------------------------------------
# PostgreSQL cancel_query – SQL injection prevention
# ---------------------------------------------------------------------------


class TestPostgresCancelQuerySecurity:
    """Verify that Postgres cancel_query uses parameterized queries."""

    @patch("sqlalchemy.engine.Engine.connect")
    def test_cancel_query_uses_parameterized_query(
        self, engine_mock: Mock
    ) -> None:
        from superset.db_engine_specs.postgres import PostgresEngineSpec
        from superset.models.sql_lab import Query

        query = Query()
        cursor_mock = engine_mock.return_value.__enter__.return_value
        assert (
            PostgresEngineSpec.cancel_query(cursor_mock, query, "12345")
            is True
        )
        cursor_mock.execute.assert_called_once_with(
            "SELECT pg_terminate_backend(pid) "
            "FROM pg_stat_activity "
            "WHERE pid=%s",
            (12345,),
        )

    @patch("sqlalchemy.engine.Engine.connect")
    def test_cancel_query_rejects_sql_injection(
        self, engine_mock: Mock
    ) -> None:
        from superset.db_engine_specs.postgres import PostgresEngineSpec
        from superset.models.sql_lab import Query

        query = Query()
        cursor_mock = engine_mock.return_value.__enter__.return_value
        result = PostgresEngineSpec.cancel_query(
            cursor_mock, query, "' OR 1=1; DROP TABLE users; --"
        )
        assert result is False
        cursor_mock.execute.assert_not_called()

    @patch("sqlalchemy.engine.Engine.connect")
    def test_cancel_query_rejects_pid_with_semicolon(
        self, engine_mock: Mock
    ) -> None:
        from superset.db_engine_specs.postgres import PostgresEngineSpec
        from superset.models.sql_lab import Query

        query = Query()
        cursor_mock = engine_mock.return_value.__enter__.return_value
        result = PostgresEngineSpec.cancel_query(
            cursor_mock, query, "123; SELECT pg_terminate_backend(1)"
        )
        assert result is False
        cursor_mock.execute.assert_not_called()


# ---------------------------------------------------------------------------
# PostgreSQL get_prequeries – schema name injection prevention
# ---------------------------------------------------------------------------


class TestPostgresPrequeriesSecurity:
    """Verify that Postgres get_prequeries validates schema names."""

    def test_valid_schema_name(self, mocker: MockerFixture) -> None:
        from superset.db_engine_specs.postgres import PostgresEngineSpec

        database = mocker.MagicMock()
        result = PostgresEngineSpec.get_prequeries(database, schema="my_schema")
        assert result == ['set search_path = "my_schema"']

    def test_empty_schema_returns_empty(self, mocker: MockerFixture) -> None:
        from superset.db_engine_specs.postgres import PostgresEngineSpec

        database = mocker.MagicMock()
        assert PostgresEngineSpec.get_prequeries(database, schema="") == []

    def test_none_schema_returns_empty(self, mocker: MockerFixture) -> None:
        from superset.db_engine_specs.postgres import PostgresEngineSpec

        database = mocker.MagicMock()
        assert PostgresEngineSpec.get_prequeries(database) == []

    def test_rejects_schema_with_semicolon(
        self, mocker: MockerFixture
    ) -> None:
        from superset.db_engine_specs.postgres import PostgresEngineSpec

        database = mocker.MagicMock()
        with pytest.raises(ValueError, match="Invalid SQL identifier"):
            PostgresEngineSpec.get_prequeries(
                database, schema='"; DROP TABLE users; --'
            )

    def test_rejects_schema_with_double_quote(
        self, mocker: MockerFixture
    ) -> None:
        from superset.db_engine_specs.postgres import PostgresEngineSpec

        database = mocker.MagicMock()
        with pytest.raises(ValueError, match="Invalid SQL identifier"):
            PostgresEngineSpec.get_prequeries(
                database, schema='"public"'
            )

    def test_rejects_schema_with_spaces(
        self, mocker: MockerFixture
    ) -> None:
        from superset.db_engine_specs.postgres import PostgresEngineSpec

        database = mocker.MagicMock()
        with pytest.raises(ValueError, match="Invalid SQL identifier"):
            PostgresEngineSpec.get_prequeries(
                database, schema="my schema"
            )


# ---------------------------------------------------------------------------
# Oracle convert_dttm – datetime literal validation
# ---------------------------------------------------------------------------


class TestOracleConvertDttmSecurity:
    """Verify that Oracle convert_dttm validates datetime string output."""

    def test_valid_date_conversion(self) -> None:
        from datetime import datetime

        from superset.db_engine_specs.oracle import OracleEngineSpec

        dttm = datetime(2023, 1, 15)
        result = OracleEngineSpec.convert_dttm("Date", dttm)
        assert result == "TO_DATE('2023-01-15', 'YYYY-MM-DD')"

    def test_valid_timestamp_conversion(self) -> None:
        from datetime import datetime

        from superset.db_engine_specs.oracle import OracleEngineSpec

        dttm = datetime(2023, 1, 15, 10, 30, 45, 123456)
        result = OracleEngineSpec.convert_dttm("TimeStamp", dttm)
        assert "TO_TIMESTAMP(" in result
        assert "2023-01-15T10:30:45.123456" in result

    def test_valid_datetime_conversion(self) -> None:
        from datetime import datetime

        from superset.db_engine_specs.oracle import OracleEngineSpec

        dttm = datetime(2023, 1, 15, 10, 30, 45)
        result = OracleEngineSpec.convert_dttm("DateTime", dttm)
        assert "TO_DATE(" in result
        assert "2023-01-15T10:30:45" in result


# ---------------------------------------------------------------------------
# MySQL convert_dttm – datetime literal validation
# ---------------------------------------------------------------------------


class TestMySQLConvertDttmSecurity:
    """Verify that MySQL convert_dttm validates datetime string output."""

    def test_valid_date_conversion(self) -> None:
        from datetime import datetime

        from superset.db_engine_specs.mysql import MySQLEngineSpec

        dttm = datetime(2023, 1, 15)
        result = MySQLEngineSpec.convert_dttm("Date", dttm)
        assert result == "STR_TO_DATE('2023-01-15', '%Y-%m-%d')"

    def test_valid_datetime_conversion(self) -> None:
        from datetime import datetime

        from superset.db_engine_specs.mysql import MySQLEngineSpec

        dttm = datetime(2023, 1, 15, 10, 30, 45, 678900)
        result = MySQLEngineSpec.convert_dttm("DateTime", dttm)
        assert "STR_TO_DATE(" in result
        assert "2023-01-15 10:30:45.678900" in result
