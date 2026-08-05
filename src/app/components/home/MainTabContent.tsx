"use client";

import Footer from "../footer";
import CommandsPanel, { type Command } from "../sidebar/CommandsPanel";
import Avatar from "../sidebar/Avatar";
import ChatPanel from "./ChatPanel";
import type { ChatPlatform } from "@/utils/platform";
import type { MessageProps, SidebarTab } from "../../types/chat";

interface MainTabContentProps {
  activeTab: SidebarTab;
  channel: string;
  commands: Command[];
  commandVolume: number;
  isConnected: boolean;
  messages: MessageProps[];
  platform: ChatPlatform;
  setCommands: (commands: Command[]) => void;
  setToastMessage: (msg: string) => void;
}

export default function MainTabContent({
  activeTab,
  channel,
  commands,
  commandVolume,
  isConnected,
  messages,
  platform,
  setCommands,
  setToastMessage,
}: MainTabContentProps) {
  return (
    <>
      <div key={activeTab} className="flex-1 flex flex-col min-h-0 animate-tab-enter">
        {activeTab === "chat" ? (
          <ChatPanel channel={channel} platform={platform} messages={messages} setToastMessage={setToastMessage} />
        ) : activeTab === "commands" ? (
          <CommandsPanel
            commands={commands}
            setCommands={setCommands}
            commandVolume={commandVolume}
            isLocked={false}
            platform={platform}
          />
        ) : (
          <Avatar />
        )}
      </div>

      <Footer
        IsConnected={isConnected}
        channel={channel}
        MessageCount={messages.length}
      />
    </>
  );
}
