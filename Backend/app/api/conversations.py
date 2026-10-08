"""Conversations scoped to the authenticated account."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict

from app.api.chat import ChatContext, ChatRequest, MessageText, chat
from app.auth import require_user
from app.conversations import ConversationStore, model_history

router = APIRouter(prefix="/conversations", tags=["conversations"])


def user_store(request: Request, user: Annotated[dict, Depends(require_user)]):
    return ConversationStore(request.app.state.settings, user)


Store = Annotated[ConversationStore, Depends(user_store)]


class CreateConversation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID


class SendMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    request_id: UUID
    content: MessageText
    context: ChatContext
    use_web: bool = True


@router.get("")
def list_conversations(store: Store, offset: int = Query(default=0, ge=0)):
    return store.list(offset=offset)


@router.post("")
def create_conversation(payload: CreateConversation, store: Store):
    return {**store.create(str(payload.id)), "processing": False}


@router.get("/{conversation_id}")
def get_conversation(conversation_id: UUID, request: Request, store: Store):
    return {
        **store.detail(str(conversation_id)),
        "processing": request.app.state.active_conversation_id == str(conversation_id),
    }


@router.post("/{conversation_id}/messages")
def send_message(conversation_id: UUID, payload: SendMessage, request: Request, store: Store):
    state = request.app.state
    if not state.conversation_chat_lock.acquire(blocking=False):
        raise HTTPException(
            429, "The model is busy. Your message was not sent; please try again shortly."
        )
    conversation_id, request_id = str(conversation_id), str(payload.request_id)
    state.active_conversation_id = conversation_id
    try:
        cached = store.begin(
            conversation_id,
            request_id,
            payload.content,
            payload.context.model_dump(),
            payload.use_web,
        )
        if cached:
            return store.finish(conversation_id, request_id, cached)
        detail = store.detail(conversation_id)
        try:
            response = chat(
                ChatRequest(
                    messages=model_history(detail["messages"], request_id),
                    context=payload.context,
                    use_web=payload.use_web,
                ),
                request,
            )
        except HTTPException as exc:
            store.fail(request_id, str(exc.detail))
            raise
        return store.finish(conversation_id, request_id, response.model_dump(mode="json"))
    finally:
        state.active_conversation_id = None
        state.conversation_chat_lock.release()
