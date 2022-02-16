import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { v2exCli } from "@/api";
import { Topic } from "@chyroc/v2ex-api";
import { NextPageAction, PreviousPageAction, TopicDetail } from "@/components";
import { cmdE, cmdO } from "@/shortcut";

const formatUnix = (unix: number) => new Date(unix * 1000).toLocaleString();

export default (props: { nodeTitle: string; nodeName: string }) => {
  const { nodeTitle, nodeName } = props;
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    const f = async () => {
      try {
        setLoading(true);
        const res = await v2exCli.getTopicsByNode({ nodeName, page });
        setLoading(false);
        console.log(res);
        setTopics(res.topics);
      } catch (e) {
        setLoading(false);
        console.error(e);
        await showToast(Toast.Style.Failure, "请求失败", `${e}`);
      }
    };
    f();
  }, [page]);

  return (
    <List throttle={true} isLoading={loading}>
      {topics && topics.length > 0 && (
        <List.Section title={`主题 | ${nodeTitle} | 第 ${page} 页`}>
          {topics.map((v) => {
            return (
              <List.Item
                title={v.title}
                subtitle={v.content}
                key={v.id}
                accessoryTitle={`${v.replies} 回复 | ${formatUnix(v.last_modified)}`}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title={cmdO.title} icon={cmdO.icon} shortcut={cmdO.key} url={v.url} />
                    {page >= 2 && <PreviousPageAction onSelect={() => setPage(page - 1)} />}
                    {topics && topics.length >= 10 && <NextPageAction onSelect={() => setPage(page + 1)} />}
                    <Action.Push
                      icon={cmdE.icon}
                      title={cmdE.title}
                      shortcut={cmdE.key}
                      target={<TopicDetail topic={v} />}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
};
