"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  conversationMessages,
  createConversation,
  getConversation,
  listConversations,
  sendConversationMessage,
} from "./conversation-client.mjs";

const ACTIVE_KEY = "bandar-pasar.active-conversation";

function remember(id) {
  try {
    window.localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* Storage is optional. */
  }
}

export function useConversations({
  context,
  setWorkspace,
  setActiveTicker,
  setTechnicalTicker,
  setTechnicalTf,
  setMarketTf,
  setIndicators,
  useWeb,
  setUseWeb,
  openAnalyst,
}) {
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [processing, setProcessing] = useState(false);
  const active = useRef("");
  const epoch = useRef(0);
  const navigation = useRef(false);
  const pending = useRef(false);
  const retry = useRef(null);
  const createId = useRef(null);

  const refreshHistory = useCallback(async () => {
    const result = await listConversations();
    setHistory(result.conversations);
    setUser(result.user);
    return result;
  }, []);

  const show = useCallback(
    (detail, restoreContext = true) => {
      active.current = detail.conversation.id;
      setActiveId(active.current);
      remember(active.current);
      setMessages(conversationMessages(detail));
      setUser(detail.user);
      setProcessing(Boolean(detail.processing));
      retry.current = detail.retry;
      if (restoreContext) {
        setWorkspace(detail.context.workspace);
        setActiveTicker(detail.context.ticker);
        if (detail.context.workspace === "technical") {
          setTechnicalTicker?.(detail.context.ticker);
          setTechnicalTf?.(detail.context.timeframe || "1D");
          setIndicators?.(new Set(detail.context.indicators || []));
        } else {
          setMarketTf?.(detail.context.timeframe || "1D");
        }
        setUseWeb(detail.use_web);
        setDraft("");
      }
      setError(detail.retry?.error || "");
    },
    [
      setActiveTicker,
      setUseWeb,
      setWorkspace,
      setTechnicalTicker,
      setTechnicalTf,
      setMarketTf,
      setIndicators,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    const version = ++epoch.current;
    const initialize = async () => {
      try {
        const result = await listConversations(controller.signal);
        if (controller.signal.aborted || epoch.current !== version) return;
        setHistory(result.conversations);
        setUser(result.user);
        let saved;
        try {
          saved = window.localStorage.getItem(ACTIVE_KEY);
        } catch {
          /* Optional. */
        }
        const selected =
          result.conversations.find((item) => item.id === saved) ||
          result.conversations[0];
        if (selected) {
          const detail = await getConversation(selected.id, controller.signal);
          if (!controller.signal.aborted && epoch.current === version)
            show(detail);
        }
      } catch (failure) {
        if (!controller.signal.aborted && epoch.current === version)
          setError(failure.message);
      } finally {
        if (!controller.signal.aborted && epoch.current === version)
          setLoading(false);
      }
    };
    void initialize();
    return () => controller.abort();
  }, [show]);

  useEffect(() => {
    if (!processing || !activeId) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const detail = await getConversation(activeId);
        if (!cancelled && active.current === activeId) show(detail, false);
      } catch (failure) {
        if (!cancelled) setError(failure.message);
      }
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeId, processing, show]);

  const newConversation = async () => {
    if (navigation.current) return;
    navigation.current = true;
    const version = ++epoch.current;
    setLoading(true);
    setError("");
    createId.current ||= crypto.randomUUID();
    try {
      const detail = await createConversation(createId.current);
      createId.current = null;
      if (epoch.current === version) show(detail);
      openAnalyst();
      await refreshHistory();
    } catch (failure) {
      setError(failure.message);
      openAnalyst();
    } finally {
      navigation.current = false;
      setLoading(false);
    }
  };

  const openConversation = async (item) => {
    if (navigation.current) return;
    navigation.current = true;
    const version = ++epoch.current;
    setLoading(true);
    setError("");
    try {
      const detail = await getConversation(item.id);
      if (epoch.current === version) show(detail);
      openAnalyst();
    } catch (failure) {
      setError(failure.message);
      openAnalyst();
    } finally {
      navigation.current = false;
      setLoading(false);
    }
  };

  const send = async (text) => {
    const question = text.trim();
    if (!question || pending.current || navigation.current || loading) return;
    pending.current = true;
    setSending(true);
    setError("");
    let conversationId = active.current;
    let ownsNavigation = false;
    const requestId =
      retry.current?.content === question
        ? retry.current.request_id
        : crypto.randomUUID();
    try {
      if (!conversationId) {
        navigation.current = true;
        ownsNavigation = true;
        createId.current ||= crypto.randomUUID();
        const detail = await createConversation(createId.current);
        createId.current = null;
        show(detail, false);
        conversationId = detail.conversation.id;
        navigation.current = false;
        ownsNavigation = false;
      }
      retry.current = { request_id: requestId, content: question };
      setDraft("");
      setMessages((previous) => [
        ...previous.filter(
          (message) => message.id !== requestId && !message.analyzing,
        ),
        { role: "user", text: question, id: requestId },
        { role: "ai", text: "", analyzing: true, id: `pending-${requestId}` },
      ]);
      const detail = await sendConversationMessage(conversationId, {
        request_id: requestId,
        content: question,
        context,
        use_web: useWeb,
      });
      if (active.current === conversationId) show(detail, false);
      await refreshHistory();
    } catch (failure) {
      if (!conversationId || active.current === conversationId) {
        // Read what actually reached Supabase instead of silently removing a saved question.
        if (conversationId) {
          try {
            const detail = await getConversation(conversationId);
            if (active.current === conversationId) show(detail, false);
          } catch {
            /* Preserve the local draft and retry ID if the network is down. */
          }
        }
        if (!conversationId || active.current === conversationId) {
          retry.current = { request_id: requestId, content: question };
          setMessages((previous) =>
            previous.filter((message) => !message.analyzing),
          );
          setDraft((current) => current || question);
          setError(failure.message);
        }
      }
      try {
        await refreshHistory();
      } catch {
        /* The original error remains visible. */
      }
    } finally {
      if (ownsNavigation) navigation.current = false;
      pending.current = false;
      setSending(false);
    }
  };

  return {
    history,
    user,
    activeId,
    messages,
    draft,
    setDraft,
    error,
    isSending: loading || sending,
    newConversation,
    openConversation,
    send,
  };
}
