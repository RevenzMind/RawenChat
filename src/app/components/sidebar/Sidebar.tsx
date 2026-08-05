"use client";

import {
  Chat20Regular,
  Bot20Regular,
  Person20Regular,
  Home20Regular,
  ArrowDownload20Regular,
  Layer20Regular,
  Settings20Filled,
} from "@fluentui/react-icons";
import type { SidebarTab } from "../../types/chat";

interface SidebarProps {
  channel: string;
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  setIsModalOpen: (open: boolean) => void;
  setIsUpdateModalOpen: (open: boolean) => void;
}

const NAV_ITEMS: { tab: SidebarTab; icon: typeof Chat20Regular; label: string }[] = [
  { tab: "chat", icon: Chat20Regular, label: "Chat" },
  { tab: "commands", icon: Bot20Regular, label: "Comandos" },
  { tab: "avatar", icon: Person20Regular, label: "Avatar" },
];

const OVERLAY_ITEM = {
  tab: "overlay" as const,
  icon: Layer20Regular,
  label: "Editor de overlays",
};

export default function Sidebar({
  channel,
  activeTab,
  setActiveTab,
  setIsModalOpen,
  setIsUpdateModalOpen,
}: SidebarProps) {
  return (
    <aside
      className="app-rail"
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
    >
      <div className="rail-logo" title="RawenChat">
        <img src="/logo.png" alt="RawenChat" className="w-6 h-6" />
      </div>

      <div className="rail-divider" />

      {!channel ? (
        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          className={`rail-btn ${activeTab !== "overlay" ? "rail-btn-active" : ""}`}
          title="Inicio"
        >
          <Home20Regular className="w-5 h-5" />
        </button>
      ) : (
        <>
          {NAV_ITEMS.map(({ tab, icon: Icon, label }) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rail-btn ${activeTab === tab ? "rail-btn-active" : ""}`}
              title={label}
            >
              <Icon className="w-5 h-5" />
            </button>
          ))}
        </>
      )}

      <button
        type="button"
        onClick={() => setActiveTab(OVERLAY_ITEM.tab)}
        className={`rail-btn ${activeTab === OVERLAY_ITEM.tab ? "rail-btn-active" : ""}`}
        title={OVERLAY_ITEM.label}
      >
        <OVERLAY_ITEM.icon className="w-5 h-5" />
      </button>

      <div className="rail-spacer" />

      <div className="rail-divider" />

      <button
        type="button"
        onClick={() => setIsUpdateModalOpen(true)}
        className="rail-btn"
        title="Actualizaciones"
      >
        <ArrowDownload20Regular className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="rail-btn"
        title="Configuración"
      >
        <Settings20Filled className="w-5 h-5" />
      </button>
    </aside>
  );
}
