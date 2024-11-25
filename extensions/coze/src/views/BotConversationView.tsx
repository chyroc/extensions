import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import ChatFormView from "./ChatFormView";
import { loadHistories, useHistory, History } from "../hooks/useHistory";
import { ChatV3Message } from "@coze/api";
import { useConversation } from "../hooks/useConversation";
import EmptyConversationView from "./EmptyConversationView";
import { APIInstance, Conversation } from "../services/api";

export interface BotConversationViewProps {
  isLoading: boolean;
  api?: APIInstance;
  query?: string;
  workspaceId?: string;
  botId?: string;
  newHistory?: History;
}

const handleError = (error: Error) => {
  showToast({
    style: Toast.Style.Failure,
    title: "Error",
    message: error.message,
  });
};

export default function BotConversationView({
  isLoading: isDefaultLoading,
  api,
  query: defaultQuery,
  workspaceId: defaultWorkspaceId,
  botId: defaultBotId,
  newHistory,
}: BotConversationViewProps) {
  const [workspaceId, setWorkspaceId] = useState<string>(defaultWorkspaceId || "");
  const [botId, setBotId] = useState<string>(defaultBotId || "");
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState<string>(defaultQuery || "");
  const { histories, setHistories, removeHistories, isLoading: isHistoryLoading } = useHistory();
  const {
    messages,
    streamChat,
    isLoading: isMessagesLoading,
  } = useConversation({
    conversationId: selectedConversationId,
    api,
    onError: handleError,
  });
  const isLoading = isDefaultLoading || isHistoryLoading || isMessagesLoading;
  const isSubmitting = useRef(false);

  const onConversationSelectionChange = async (id: string | null) => {
    if (isLoading) {
      return;
    }
    if (id === newHistory?.conversation_id) {
      setWorkspaceId(newHistory.space_id);
      setBotId(newHistory.bot_id);
      setSelectedConversationId(id);
      return;
    }
    if (id === null || id === selectedConversationId) {
      return;
    }
    const history = histories.find((c) => c.conversation_id === id);
    if (!history) {
      return;
    }
    setWorkspaceId(history.space_id);
    setBotId(history.bot_id);
    setSelectedConversationId(id);
  };

  useEffect(() => {
    const initNewHistory = async () => {
      if (!newHistory) return;
      const oldHistories = await loadHistories();
      await setHistories([newHistory, ...oldHistories]);
      setSelectedConversationId(newHistory.conversation_id);
      setWorkspaceId(newHistory.space_id);
      setBotId(newHistory.bot_id);
      setQuery(newHistory.message);
    };

    initNewHistory();
  }, [newHistory]);

  const onChatSubmit = useCallback(async () => {
    if (!workspaceId || !botId || !query || isSubmitting.current) {
      return;
    }

    try {
      isSubmitting.current = true;
      await streamChat({
        workspaceId,
        botId,
        query,
      });
      setQuery("");
    } catch (error) {
      handleError(error as Error);
    } finally {
      isSubmitting.current = false;
    }
  }, [workspaceId, botId, query, streamChat]);

  const buildMarkdown = useCallback((): string => {
    const buildMessage = (message: ChatV3Message) => {
      return `* ` + "`" + `${message.role}` + "`" + `: ${message.content}`;
    };
    if (messages?.length > 0) {
      return messages.map(buildMessage).join("\n");
    }
    if (isMessagesLoading) {
      return "Loading...";
    }
    return "";
  }, [messages, isMessagesLoading]);

  const markdown = buildMarkdown();

  const conversationAction = (
    <ActionPanel>
      <Action.SubmitForm title="Submit Chat" onSubmit={onChatSubmit} />
      <Action.Push
        title="Chat Form"
        target={
          <ChatFormView isLoading={isDefaultLoading} api={api} workspaceId={workspaceId} botId={botId} query={query} />
        }
      />
      <Action.SubmitForm
        title="Clear History"
        onSubmit={async () => {
          await removeHistories();
        }}
      />
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={"Press Enter to chat"}
      onSearchTextChange={setQuery}
      isShowingDetail={histories.length > 0}
      searchText={query}
      selectedItemId={selectedConversationId}
      onSelectionChange={onConversationSelectionChange}
      actions={conversationAction}
    >
      {histories.length > 0 && !isHistoryLoading ? (
        histories.map((history) => (
          <List.Item
            id={history.conversation_id}
            key={history.conversation_id}
            title={history.message}
            detail={<List.Item.Detail markdown={markdown} />}
            actions={conversationAction}
          />
        ))
      ) : (
        <EmptyConversationView isLoading={isDefaultLoading} api={api} />
      )}
    </List>
  );
}
