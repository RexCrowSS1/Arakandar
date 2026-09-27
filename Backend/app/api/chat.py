"""Validated chat endpoint backed by the local Arakandar model."""

import logging
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.ai import ModelBusyError, ModelUnavailableError, PromptTooLongError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])
MessageText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=8000)
]


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: MessageText


class ChatContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    workspace: Literal["market", "technical"] = "market"
    ticker: str = Field(default="IHSG", max_length=32, pattern=r"^[A-Za-z0-9.^/=_-]+$")
    indicators: list[Literal["RSI", "MACD"]] = Field(default_factory=list, max_length=2)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)
    context: ChatContext = Field(default_factory=ChatContext)

    @model_validator(mode="after")
    def validate_conversation(self):
        if self.messages[-1].role != "user":
            raise ValueError("The conversation must end with a user question")
        if sum(len(message.content) for message in self.messages) > 32000:
            raise ValueError("Conversation is too long")
        return self


class ChatResponse(BaseModel):
    reply: str
    model: str


@router.post("", response_model=ChatResponse)
def chat(payload: ChatRequest, request: Request) -> ChatResponse:
    service = request.app.state.chat_model
    try:
        reply = service.generate(
            [message.model_dump() for message in payload.messages], payload.context.model_dump()
        )
    except ModelUnavailableError as exc:
        raise HTTPException(503, "Model Arakandar belum siap. Periksa log backend.") from exc
    except ModelBusyError as exc:
        raise HTTPException(429, "Model sedang menjawab. Coba lagi sebentar.") from exc
    except PromptTooLongError as exc:
        raise HTTPException(422, "Pesan terlalu panjang. Pendekkan pertanyaan Anda.") from exc
    except Exception as exc:
        logger.exception("Local model inference failed")
        raise HTTPException(503, "Model gagal menjawab. Silakan coba lagi.") from exc
    return ChatResponse(reply=reply, model=service.settings.ai_model_id)
