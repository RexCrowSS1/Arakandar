"""Durable conversations using the project's existing Supabase tables."""

from datetime import UTC, datetime
from uuid import NAMESPACE_URL, UUID, uuid5

from fastapi import HTTPException

from app.config import Settings
from app.supabase import get_supabase_client

ADMIN_ID = str(uuid5(NAMESPACE_URL, "bandar-pasar/shared-admin"))
ADMIN_EMAIL = "admin@bandarpasar.local"
DEFAULT_CONTEXT = {"workspace": "market", "ticker": "IHSG", "indicators": [], "sectors_api_url": None}


class StorageUnavailableError(Exception):
    pass


def related_id(request_id: str, purpose: str) -> str:
    return str(uuid5(UUID(request_id), purpose))


class ConversationStore:
    def __init__(self, settings: Settings, user: dict):
        self.settings = settings
        self.user = user

    @property
    def client(self):
        # All database access stays on the server.
        if not self.settings.supabase_secret_key:
            raise StorageUnavailableError("A server-side Supabase secret key is required")
        try:
            return get_supabase_client(self.settings)
        except Exception as exc:
            raise StorageUnavailableError from exc

    def execute(self, query):
        try:
            return query.execute().data
        except Exception as exc:
            raise StorageUnavailableError from exc

    def list(self, offset: int = 0, limit: int = 100) -> dict:
        user = self.user
        rows = self.execute(
            self.client.table("conversations")
            .select("id,title,created_at,updated_at")
            .eq("user_id", user["id"])
            .order("updated_at", desc=True)
            .order("id", desc=True)
            .range(offset, offset + limit)
        )
        return {"user": user, "conversations": rows[:limit], "has_more": len(rows) > limit}

    def conversation(self, conversation_id: str) -> dict:
        rows = self.execute(
            self.client.table("conversations")
            .select("id,user_id,title,created_at,updated_at")
            .eq("id", conversation_id)
            .eq("user_id", self.user["id"])
            .limit(1)
        )
        if not rows:
            raise HTTPException(404, "Conversation not found.")
        return rows[0]

    def create(self, conversation_id: str) -> dict:
        self.execute(
            self.client.table("conversations").upsert(
                {
                    "id": conversation_id,
                    "user_id": self.user["id"],
                    "title": "New Conversation",
                },
                on_conflict="id",
                ignore_duplicates=True,
            )
        )
        return self.detail(conversation_id)

    def detail(self, conversation_id: str) -> dict:
        conversation = self.conversation(conversation_id)
        rows = []
        while True:
            page = self.execute(
                self.client.table("messages")
                .select(
                    "id,role,content,created_at,agent_logs(tool_name,input_payload,output_payload)"
                )
                .eq("conversation_id", conversation_id)
                .order("created_at")
                .order("id")
                .range(len(rows), len(rows) + 499)
            )
            rows.extend(page)
            if len(page) < 500:
                break
        context = dict(DEFAULT_CONTEXT)
        use_web = True
        messages = []
        retry = None
        for row in rows:
            logs = row.pop("agent_logs", []) or []
            message = {**row, "web": None, "model": None}
            if row["role"] == "user":
                retry = {
                    "request_id": row["id"],
                    "content": row["content"],
                    "status": "pending",
                    "error": None,
                }
            for log in logs:
                data = log.get("input_payload") or {}
                output = log.get("output_payload") or {}
                if log["tool_name"] == "chat_request":
                    context = data.get("context", context)
                    use_web = data.get("use_web", use_web)
                    retry = {
                        "request_id": row["id"],
                        "content": row["content"],
                        "status": output.get("status", "pending"),
                        "error": output.get("error"),
                    }
                elif log["tool_name"] == "chat_response":
                    message["web"] = output.get("web")
                    message["model"] = output.get("model")
                    message["market"] = output.get("market")
            messages.append(message)
        if retry and any(
            message["id"] == related_id(retry["request_id"], "assistant") for message in messages
        ):
            retry = None
        return {
            "conversation": conversation,
            "user": self.user,
            "messages": messages,
            "context": context,
            "use_web": use_web,
            "retry": retry,
        }

    def begin(
        self, conversation_id: str, request_id: str, content: str, context: dict, use_web: bool
    ):
        conversation = self.conversation(conversation_id)
        existing = self.execute(
            self.client.table("messages").select("*").eq("id", request_id).limit(1)
        )
        if existing and (
            existing[0]["conversation_id"] != conversation_id
            or existing[0]["role"] != "user"
            or existing[0]["content"] != content
        ):
            raise HTTPException(
                409, "This message ID has already been used for a different message."
            )
        log_id = related_id(request_id, "request")
        previous = self.execute(
            self.client.table("agent_logs").select("*").eq("id", log_id).limit(1)
        )
        if previous and (previous[0].get("output_payload") or {}).get("status") == "completed":
            return previous[0]["output_payload"]
        self.execute(
            self.client.table("messages").upsert(
                {
                    "id": request_id,
                    "conversation_id": conversation_id,
                    "role": "user",
                    "content": content,
                },
                on_conflict="id",
                ignore_duplicates=True,
            )
        )
        self.execute(
            self.client.table("agent_logs").upsert(
                {
                    "id": log_id,
                    "message_id": request_id,
                    "tool_name": "chat_request",
                    "input_payload": {"context": context, "use_web": use_web},
                    "output_payload": {"status": "pending"},
                },
                on_conflict="id",
            )
        )
        update = {"updated_at": datetime.now(UTC).isoformat()}
        if conversation["title"] == "New Conversation":
            update["title"] = " ".join(content.split())[:100]
        self.execute(
            self.client.table("conversations")
            .update(update)
            .eq("id", conversation_id)
            .eq("user_id", self.user["id"])
        )
        return None

    def finish(self, conversation_id: str, request_id: str, result: dict) -> dict:
        # Save the generated result first so a partial write can be recovered without
        # regenerating a different answer. IDs make all subsequent writes retryable.
        result = {**result, "status": "completed"}
        self.execute(
            self.client.table("agent_logs")
            .update({"output_payload": result})
            .eq("id", related_id(request_id, "request"))
        )
        assistant_id = related_id(request_id, "assistant")
        self.execute(
            self.client.table("messages").upsert(
                {
                    "id": assistant_id,
                    "conversation_id": conversation_id,
                    "role": "assistant",
                    "content": result["reply"],
                },
                on_conflict="id",
                ignore_duplicates=True,
            )
        )
        self.execute(
            self.client.table("agent_logs").upsert(
                {
                    "id": related_id(request_id, "response"),
                    "message_id": assistant_id,
                    "tool_name": "chat_response",
                    "output_payload": result,
                },
                on_conflict="id",
            )
        )
        self.execute(
            self.client.table("conversations")
            .update({"updated_at": datetime.now(UTC).isoformat()})
            .eq("id", conversation_id)
            .eq("user_id", self.user["id"])
        )
        return {**self.detail(conversation_id), "processing": False}

    def fail(self, request_id: str, detail: str) -> None:
        self.execute(
            self.client.table("agent_logs")
            .update({"output_payload": {"status": "failed", "error": detail}})
            .eq("id", related_id(request_id, "request"))
        )


def model_history(messages: list[dict], latest_id: str) -> list[dict]:
    # Model context always comes from Supabase, never from client-supplied history.
    end = next(index for index, message in enumerate(messages) if message["id"] == latest_id)
    history = [
        {"role": message["role"], "content": message["content"]}
        for message in messages[max(0, end - 19) : end + 1]
        if message["role"] in {"user", "assistant"} and message["content"].strip()
    ]
    while len(history) > 1 and (
        sum(len(message["content"]) for message in history) > 32000
        or history[0]["role"] == "assistant"
    ):
        history.pop(0)
    return history
