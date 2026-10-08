from unittest.mock import Mock
from uuid import uuid4

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from test_conversations import MemoryDatabase

from app.auth import AuthService, require_user
from app.config import Settings
from app.conversations import ADMIN_EMAIL, ADMIN_ID, ConversationStore
from app.factory import create_app


@pytest.fixture
def setup(monkeypatch):
    settings = Settings(
        _env_file=None,
        ai_enabled=False,
        supabase_url="https://test.supabase.co",
        supabase_secret_key="server-key",
        supabase_publishable_key="public-key",
    )
    db = MemoryDatabase()
    monkeypatch.setattr("app.auth.get_supabase_client", lambda settings: db)
    monkeypatch.setattr("app.conversations.get_supabase_client", lambda settings: db)
    app = create_app(settings)
    return app, db


def identity(email="test@example.com", **overrides):
    return {
        "id": str(uuid4()),
        "email": email,
        "email_confirmed_at": "2026-10-08T00:00:00Z",
        "user_metadata": {"name": "Test User"},
        "app_metadata": {},
        **overrides,
    }


def session(user):
    return {"user": user, "access_token": "access", "refresh_token": "refresh", "expires_in": 3600}


def test_all_private_endpoints_require_login(setup):
    app, _ = setup
    with TestClient(app) as client:
        for path in ("/auth/me", "/conversations", f"/conversations/{uuid4()}"):
            assert client.get(path).status_code == 401
        for path, payload in (
            ("/conversations", {"id": str(uuid4())}),
            (
                f"/conversations/{uuid4()}/messages",
                {"request_id": str(uuid4()), "content": "Halo", "context": {}},
            ),
            ("/chat", {"messages": [{"role": "user", "content": "Halo"}]}),
            ("/web/search", {"query": "BBCA"}),
        ):
            assert client.post(path, json=payload).status_code == 401


def test_signup_persists_profile_and_never_accepts_role(setup):
    app, db = setup
    user = identity()
    app.state.auth.call = Mock(return_value=session(user))
    with TestClient(app) as client:
        payload = {"name": "Test User", "email": "test@example.com", "password": "password123"}
        response = client.post("/auth/sign-up", json=payload)
        assert response.status_code == 201
        assert response.json()["user"]["role"] == "user"
        assert db.tables["users"][user["id"]]["email"] == user["email"]
        assert "password" not in str(db.tables)
        assert client.post("/auth/sign-up", json={**payload, "role": "admin"}).status_code == 422
        assert (
            client.post("/auth/sign-up", json={**payload, "email": ADMIN_EMAIL}).status_code == 400
        )
        assert (
            client.post("/auth/sign-up", json={**payload, "password": "short"}).status_code == 422
        )
        assert client.post("/auth/sign-up", json={**payload, "email": "invalid"}).status_code == 422


def test_email_confirmation_does_not_create_an_authenticated_session(setup):
    app, db = setup
    app.state.auth.call = Mock(return_value={"id": str(uuid4())})
    with TestClient(app) as client:
        response = client.post(
            "/auth/sign-up",
            json={"name": "Test", "email": "t@example.com", "password": "password123"},
        )
    assert response.json() == {"requires_confirmation": True}
    assert not db.tables["users"]


def test_admin_login_preserves_existing_history_owner(setup):
    app, db = setup
    db.tables["users"][ADMIN_ID] = {"id": ADMIN_ID, "name": "Admin", "email": ADMIN_EMAIL}
    user = identity(ADMIN_EMAIL, app_metadata={"role": "admin"})
    app.state.auth.call = Mock(return_value=session(user))
    with TestClient(app) as client:
        response = client.post(
            "/auth/sign-in", json={"email": "admin", "password": "test-admin-password"}
        )
    assert response.status_code == 200
    assert response.json()["user"]["id"] == ADMIN_ID
    assert response.json()["user"]["role"] == "admin"
    assert app.state.auth.call.call_args.kwargs["payload"]["email"] == ADMIN_EMAIL


def test_user_metadata_cannot_grant_admin_access(setup):
    app, _ = setup
    profile = app.state.auth.profile(identity(user_metadata={"name": "Test", "role": "admin"}))
    assert profile["role"] == "user"
    with pytest.raises(HTTPException) as error:
        app.state.auth.profile(identity(email_confirmed_at=None))
    assert error.value.status_code == 403


def test_two_accounts_cannot_read_create_or_send_to_each_others_conversations(setup):
    app, db = setup
    alice = app.state.auth.profile(identity("alice@example.com"))
    bob = app.state.auth.profile(identity("bob@example.com"))
    store = ConversationStore(app.state.settings, alice)
    conversation_id = str(uuid4())
    store.create(conversation_id)
    app.dependency_overrides[require_user] = lambda: bob
    with TestClient(app) as client:
        assert client.get("/conversations").json()["conversations"] == []
        assert client.get(f"/conversations/{conversation_id}").status_code == 404
        assert client.post("/conversations", json={"id": conversation_id}).status_code == 404
        assert (
            client.post(
                f"/conversations/{conversation_id}/messages",
                json={
                    "request_id": str(uuid4()),
                    "content": "Steal history",
                    "context": {},
                },
            ).status_code
            == 404
        )
    assert db.tables["conversations"][conversation_id]["user_id"] == alice["id"]
    assert not db.tables["messages"]


def test_get_user_uses_bearer_and_refresh_returns_verified_profile(setup):
    app, _ = setup
    user = identity()
    app.state.auth.call = Mock(return_value=user)
    with TestClient(app) as client:
        response = client.get("/auth/me", headers={"Authorization": "Bearer verified-token"})
        assert response.status_code == 200
        app.state.auth.call.assert_called_once_with("GET", "user", token="verified-token")
        app.state.auth.call.return_value = session(user)
        refreshed = client.post("/auth/refresh", json={"refresh_token": "old-token"})
        assert refreshed.json()["user"]["id"] == user["id"]
        app.state.auth.call.return_value = {}
        assert (
            client.post("/auth/sign-out", headers={"Authorization": "Bearer access"}).status_code
            == 200
        )
        app.state.auth.call.assert_called_with("POST", "logout?scope=local", token="access")


@pytest.mark.parametrize("status,expected", [(400, 401), (429, 429), (500, 503)])
def test_provider_errors_are_sanitized(setup, monkeypatch, status, expected):
    app, _ = setup
    monkeypatch.setattr(
        "app.auth.httpx.request",
        lambda *args, **kwargs: httpx.Response(status, json={"msg": "private-provider-internals"}),
    )
    with TestClient(app) as client:
        response = client.post("/auth/sign-in", json={"email": "admin", "password": "bad"})
    assert response.status_code == expected
    assert "private-provider-internals" not in response.text


def test_missing_supabase_configuration_is_actionable():
    service = AuthService(
        Settings(
            _env_file=None,
            supabase_url=None,
            supabase_secret_key=None,
            supabase_publishable_key=None,
        )
    )
    with pytest.raises(HTTPException) as error:
        service.call("GET", "user", token="token")
    assert error.value.status_code == 503
