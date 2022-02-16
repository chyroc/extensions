import { ActionPanel, confirmAlert, List, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { v2exCli } from "@/api";
import { Notification } from "@chyroc/v2ex-api";
import { stripHtml } from "string-strip-html";
import { NextPageAction, PreviousPageAction } from "@/components";
import { cmdD } from "@/shortcut";

export default () => {
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const f = async () => {
      try {
        setLoading(true);
        const res = await v2exCli.getNotifications({ page });
        setLoading(false);
        console.log(res);
        setTotal(res.total);
        setNotifications(res.notifications);
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
      {notifications && notifications.length > 0 && (
        <List.Section title={`通知 | 第 ${page} 页 | 共 ${total} 条`}>
          {notifications.map((v) => {
            return (
              <List.Item
                title={stripHtml(v.text).result}
                key={v.id}
                actions={
                  <ActionPanel>
                    {page >= 2 && <PreviousPageAction onSelect={() => setPage(page - 1)} />}
                    {total > page * 10 && <NextPageAction onSelect={() => setPage(page + 1)} />}
                    <ActionPanel.Item
                      icon={cmdD.icon}
                      title={cmdD.title}
                      shortcut={cmdD.key}
                      onAction={async () => {
                        const confirm = await confirmAlert({
                          title: "确认删除这条通知?",
                          message: stripHtml(v.text).result,
                        });
                        if (confirm) {
                          try {
                            await v2exCli.deleteNotification({ notificationID: v.id });
                          } catch (e) {
                            console.error(e);
                            await showToast(Toast.Style.Failure, "请求失败", `${e}`);
                          }
                        }
                      }}
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
