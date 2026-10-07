from copy import deepcopy
from datetime import UTC, datetime, timedelta
from threading import Lock
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.config import Settings
from app.conversations import (
    ADMIN_ID,
    DEFAULT_CONTEXT,
    ConversationStore,
    model_history,
    related_id,
)
from app.factory import create_app
from app.web import WebSearchResult


class MemoryDatabase:
    """Small PostgREST transport double: exercises the real repository's queries."""

    def __init__(self):
        self.tables = {name: {} for name in ("users", "conversations", "messages", "agent_logs")}
        self.sequence = 0
        self.failure = None

    def table(self, name):
        return Query(self, name)


class Query:
    def __init__(self, db, name):
        self.db, self.name = db, name
        self.filters, self.orders = [], []
        self.start, self.stop, self.columns = 0, 100000, "*"
        self.operation, self.payload, self.ignore = "select", None, False

    def select(self, columns):
        self.columns = columns
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def limit(self, count):
        self.stop = count
        return self

    def range(self, start, end):
        self.start, self.stop = start, end + 1
        return self

    def order(self, column, desc=False):
        self.orders.append((column, desc))
        return self

    def upsert(self, payload, on_conflict, ignore_duplicates=False):
        assert on_conflict == "id"
        self.operation, self.payload, self.ignore = "upsert", payload, ignore_duplicates
        return self

    def update(self, payload):
        self.operation, self.payload = "update", payload
        return self

    def execute(self):
        if self.db.failure and self.db.failure(self):
            raise RuntimeError("private database credential details")
        table = self.db.tables[self.name]
        rows = [row for row in table.values() if all(row.get(k) == v for k, v in self.filters)]
        if self.operation == "upsert":
            row = table.get(self.payload["id"])
            if row is None:
                self.db.sequence += 1
                stamp = (
                    datetime(2026, 10, 7, tzinfo=UTC) + timedelta(seconds=self.db.sequence)
                ).isoformat()
                row = {"created_at": stamp, "updated_at": stamp, **deepcopy(self.payload)}
                table[row["id"]] = row
            elif not self.ignore:
                row.update(deepcopy(self.payload))
            rows = [row]
        elif self.operation == "update":
            for row in rows:
                row.update(deepcopy(self.payload))
        for column, desc in reversed(self.orders):
            rows.sort(key=lambda row: row.get(column, ""), reverse=desc)
        rows = deepcopy(rows[self.start : self.stop])
        if "agent_logs(" in self.columns:
            for row in rows:
                row["agent_logs"] = [
                    deepcopy(log)
                    for log in self.db.tables["agent_logs"].values()
                    if log.get("message_id") == row["id"]
                ]
        return SimpleNamespace(data=rows)


@pytest.fixture
def setup(monkeypatch):
    db = MemoryDatabase()
    monkeypatch.setattr("app.conversations.get_supabase_client", lambda settings: db)
    settings = Settings(_env_file=None, ai_enabled=False, supabase_secret_key="test-server-key")
    app = create_app(settings)
    app.state.chat_model = SimpleNamespace(
        is_ready=True, lock=Lock(), settings=settings, generate=Mock(return_value="Jawaban [1]")
    )
    app.state.market = SimpleNamespace(evidence=Mock(return_value={"status": "unavailable"}))
    app.state.web_search = SimpleNamespace(
        search=Mock(return_value=WebSearchResult(status="disabled"))
    )
    return db, app, app.state.conversations


def send_payload(content="Analisis BBCA"):
    return {
        "request_id": str(uuid4()),
        "content": content,
        "context": DEFAULT_CONTEXT,
        "use_web": False,
    }


def test_one_admin_and_idempotent_conversation_creation(setup):
    db, app, store = setup
    conversation_id = str(uuid4())
    first = store.create(conversation_id)
    second = ConversationStore(store.settings).create(conversation_id)
    assert first == second
    assert len(db.tables["users"]) == 1
    assert first["user"]["id"] == ADMIN_ID
    assert first["conversation"]["user_id"] == ADMIN_ID
    assert len(store.list()["conversations"]) == 1


def test_other_users_conversations_cannot_be_opened_or_overwritten(setup):
    db, app, store = setup
    conversation_id = str(uuid4())
    db.tables["conversations"][conversation_id] = {"id": conversation_id, "user_id": str(uuid4())}
    assert store.list()["conversations"] == []
    with pytest.raises(HTTPException) as error:
        store.create(conversation_id)
    assert error.value.status_code == 404


def test_persisted_chat_uses_database_history_and_retries_without_duplicates(setup):
    db, app, store = setup
    conversation_id = str(uuid4())
    with TestClient(app) as client:
        assert client.post("/conversations", json={"id": conversation_id}).status_code == 200
        first = send_payload("Nama saham yang dibahas BBCA")
        path = f"/conversations/{conversation_id}/messages"
        assert client.post(path, json=first).status_code == 200
        second = send_payload("Apa saham yang tadi dibahas?")
        response = client.post(path, json=second)
        assert response.status_code == 200
        history = app.state.chat_model.generate.call_args.args[0]
        assert [message["content"] for message in history] == [
            first["content"],
            "Jawaban [1]",
            second["content"],
        ]
        assert client.post(path, json=second).status_code == 200
        assert app.state.chat_model.generate.call_count == 2
        detail = client.get(f"/conversations/{conversation_id}").json()
        assert [message["role"] for message in detail["messages"]] == [
            "user",
            "assistant",
            "user",
            "assistant",
        ]
        assert detail["messages"][-1]["market"] == {"status": "unavailable"}
        assert detail["messages"][1]["model"] == app.state.chat_model.settings.ai_model_id
        assert detail["messages"][1]["web"]["status"] == "disabled"
        assert detail["conversation"]["title"] == first["content"]
        assert detail["retry"] is None
        assert detail["processing"] is False
        assert len(db.tables["messages"]) == 4


def test_model_failure_keeps_question_and_can_retry_same_request(setup):
    db, app, store = setup
    conversation_id = str(uuid4())
    store.create(conversation_id)
    payload = send_payload()
    path = f"/conversations/{conversation_id}/messages"
    with TestClient(app) as client:
        app.state.chat_model.is_ready = False
        assert client.post(path, json=payload).status_code == 503
        detail = client.get(f"/conversations/{conversation_id}").json()
        assert len(detail["messages"]) == 1
        assert detail["messages"][0]["content"] == payload["content"]
        assert detail["retry"]["status"] == "failed"
        assert not app.state.conversation_chat_lock.locked()
        app.state.chat_model.is_ready = True
        assert client.post(path, json=payload).status_code == 200
        assert len(db.tables["messages"]) == 2


def test_partial_response_write_is_recovered_without_regenerating(setup):
    db, app, store = setup
    conversation_id = str(uuid4())
    store.create(conversation_id)
    payload = send_payload()
    path = f"/conversations/{conversation_id}/messages"
    db.failure = lambda query: (
        query.name == "messages"
        and query.operation == "upsert"
        and query.payload["role"] == "assistant"
    )
    with TestClient(app) as client:
        response = client.post(path, json=payload)
        assert response.status_code == 503
        assert "private database" not in response.text
        db.failure = None
        response = client.post(path, json=payload)
        assert response.status_code == 200
        assert app.state.chat_model.generate.call_count == 1
        assert len(response.json()["messages"]) == 2
        assert response.json()["retry"] is None


def test_request_id_cannot_replace_existing_question(setup):
    db, app, store = setup
    conversation_id = str(uuid4())
    store.create(conversation_id)
    payload = send_payload()
    with TestClient(app) as client:
        path = f"/conversations/{conversation_id}/messages"
        assert client.post(path, json=payload).status_code == 200
        assert client.post(path, json={**payload, "content": "Overwrite"}).status_code == 409
        assert db.tables["messages"][payload["request_id"]]["content"] == payload["content"]


def test_storage_unavailable_and_untrusted_owner_or_history_are_rejected(setup):
    db, app, store = setup
    with TestClient(app) as client:
        assert (
            client.post(
                "/conversations", json={"id": str(uuid4()), "user_id": str(uuid4())}
            ).status_code
            == 422
        )
        assert (
            client.post(
                f"/conversations/{uuid4()}/messages", json={**send_payload(), "messages": []}
            ).status_code
            == 422
        )
        db.failure = lambda query: True
        response = client.get("/conversations")
        assert response.status_code == 503
        assert "private database" not in response.text
        app.state.chat_model.generate.assert_not_called()


def test_busy_conversation_does_not_start_second_generation(setup):
    db, app, store = setup
    with TestClient(app) as client, app.state.conversation_chat_lock:
        assert (
            client.post(f"/conversations/{uuid4()}/messages", json=send_payload()).status_code
            == 429
        )
    assert not db.tables["messages"]


def test_pagination_keeps_older_conversations_accessible(setup):
    db, app, store = setup
    for _ in range(5):
        store.create(str(uuid4()))
    first = store.list(limit=3)
    second = store.list(offset=3, limit=3)
    assert first["has_more"] is True
    assert second["has_more"] is False
    assert len({row["id"] for page in (first, second) for row in page["conversations"]}) == 5


def test_model_history_keeps_latest_question_within_model_limits():
    messages = [
        {"id": str(index), "role": "user" if index % 2 == 0 else "assistant", "content": "x" * 8000}
        for index in range(25)
    ]
    history = model_history(messages, "24")
    assert history[-1]["content"] == messages[-1]["content"]
    assert history[0]["role"] == "user"
    assert len(history) <= 20
    assert sum(len(message["content"]) for message in history) <= 32000
    assert related_id(str(uuid4()), "assistant")
