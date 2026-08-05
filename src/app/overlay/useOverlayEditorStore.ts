"use client";

import { create } from "zustand";
import type {
  OverlayAsset,
  OverlaySceneConfig,
  OverlaySettings,
  OverlayWidget,
  OverlayWidgetKind,
} from "@/types/overlay";
import {
  broadcastOverlayScene,
  buildNewScene,
  cloneScene,
  createDefaultScene,
  createSettingsFromScene,
  createWidget,
  persistOverlaySettingsToServer,
  readOverlaySceneRecordFromServer,
  readOverlaySettingsFromServer,
  readStoredOverlayScene,
  readStoredOverlaySettings,
  writeOverlayScene,
  writeOverlaySettings,
} from "@/utils/overlay";

interface OverlayEditorState {
  // Scene list
  scenes: OverlaySceneConfig[];
  activeSceneId: string;
  // Active scene shorthand
  scene: OverlaySceneConfig;
  // Selection
  selectedWidgetId: string | null;
  selectedAssetId: string | null;

  // Lifecycle
  initialize: () => void;

  // Settings persistence
  saveSettings: () => void;

  // Scene mutations
  setScene: (updater: OverlaySceneConfig | ((scene: OverlaySceneConfig) => OverlaySceneConfig)) => void;
  createScene: (name?: string) => string | null; // returns error string or null on success
  switchScene: (sceneId: string) => void;
  renameScene: (sceneId: string, name: string) => string | null; // returns error string or null
  duplicateScene: (sceneId: string) => void;
  deleteScene: (sceneId: string) => void;
  resetScene: () => void;

  // Widget mutations
  selectWidget: (widgetId: string | null) => void;
  addWidget: (kind: OverlayWidgetKind) => void;
  updateWidget: (widgetId: string, updater: (widget: OverlayWidget) => OverlayWidget) => void;
  removeWidget: (widgetId: string) => void;
  duplicateWidget: (widgetId: string) => void;
  bringForward: (widgetId: string) => void;
  sendBackward: (widgetId: string) => void;

  // Asset mutations
  selectAsset: (assetId: string | null) => void;
  addAsset: (asset: OverlayAsset) => void;
  removeAsset: (assetId: string) => void;
}

function withUpdatedScene(scene: OverlaySceneConfig): OverlaySceneConfig {
  const previousTimestamp = Date.parse(scene.updatedAt) || 0;
  const nextTimestamp = Math.max(Date.now(), previousTimestamp + 1);
  return { ...scene, updatedAt: new Date(nextTimestamp).toISOString() };
}

function replaceScene(
  scenes: OverlaySceneConfig[],
  updatedScene: OverlaySceneConfig
): OverlaySceneConfig[] {
  return scenes.map((s) => (s.id === updatedScene.id ? updatedScene : s));
}

function buildSettings(
  scenes: OverlaySceneConfig[],
  activeSceneId: string
): OverlaySettings {
  return { activeSceneId, scenes };
}

// Start completely empty — initialize() fills it from localStorage/server.
// This prevents any flash of default widgets before settings load.
const emptyScene: OverlaySceneConfig = {
  id: "__loading__",
  name: "",
  width: 1920,
  height: 1080,
  backgroundColor: "transparent",
  backgroundAssetId: null,
  widgetAccentColor: "",
  snapToGrid: false,
  showGuides: false,
  widgets: [],
  assets: [],
  updatedAt: new Date(0).toISOString(),
};

export const useOverlayEditorStore = create<OverlayEditorState>((set, get) => ({
  scenes: [emptyScene],
  activeSceneId: emptyScene.id,
  scene: emptyScene,
  selectedWidgetId: null,
  selectedAssetId: null,

  initialize: () => {
    // 1. Load stored settings (scene list) from localStorage first for instant UI
    const storedSettings = readStoredOverlaySettings();
    const storedScene = readStoredOverlayScene(); // legacy single-scene fallback

    let localSettings: OverlaySettings;
    if (storedSettings?.scenes?.length) {
      localSettings = storedSettings;
    } else if (storedScene) {
      // Migrate legacy single-scene localStorage into settings format
      localSettings = createSettingsFromScene(storedScene);
    } else {
      const defaultScene = createDefaultScene();
      defaultScene.widgets = []; // empty — user builds from scratch
      localSettings = createSettingsFromScene(defaultScene);
    }

    const activeScene =
      localSettings.scenes.find((s) => s.id === localSettings.activeSceneId) ??
      localSettings.scenes[0];

    // Deduplicate scenes by id and write back — cleans any corrupt localStorage
    const dedupedLocal = localSettings.scenes.filter(
      (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i
    );
    const dedupedActive =
      dedupedLocal.find((s) => s.id === localSettings.activeSceneId) ??
      dedupedLocal[0];

    // Write cleaned settings back so localStorage never accumulates duplicates
    const cleanedLocalSettings = buildSettings(dedupedLocal, dedupedActive.id);
    writeOverlaySettings(cleanedLocalSettings);

    set({
      scenes: dedupedLocal,
      activeSceneId: dedupedActive.id,
      scene: dedupedActive,
    });
    void Promise.all([
      readOverlaySettingsFromServer(),
      readOverlaySceneRecordFromServer(),
    ]).then(([remoteSettings, remoteRecord]) => {
      const remoteActiveAt = remoteSettings
        ? Math.max(
            ...remoteSettings.scenes.map((s) => Date.parse(s.updatedAt) || 0)
          )
        : 0;
      const localActiveAt = Math.max(
        ...localSettings.scenes.map((s) => Date.parse(s.updatedAt) || 0)
      );

      let finalSettings = localSettings;

      if (remoteSettings && remoteActiveAt > localActiveAt) {
        finalSettings = remoteSettings;
      } else if (remoteRecord) {
        // Server has a single scene record but no full settings — merge in
        const remoteUpdatedAt = Date.parse(remoteRecord.scene.updatedAt) || 0;
        const localUpdatedAt = Date.parse(activeScene.updatedAt) || 0;
        if (remoteUpdatedAt > localUpdatedAt) {
          const merged = localSettings.scenes.map((s) =>
            s.id === activeScene.id ? (remoteRecord.scene as OverlaySceneConfig) : s
          );
          finalSettings = buildSettings(merged, activeScene.id);
        }
      }

      const finalActive =
        finalSettings.scenes.find((s) => s.id === finalSettings.activeSceneId) ??
        finalSettings.scenes[0];

      // Deduplicate here too — server data can also carry duplicates
      const dedupedFinal = finalSettings.scenes.filter(
        (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i
      );
      const dedupedFinalActive =
        dedupedFinal.find((s) => s.id === finalSettings.activeSceneId) ??
        dedupedFinal[0];
      const cleanSettings = buildSettings(dedupedFinal, dedupedFinalActive.id);

      writeOverlayScene(dedupedFinalActive);
      writeOverlaySettings(cleanSettings);
      // Re-sync to server so Last.fm credentials from localStorage
      // get injected into widget data for the live/OBS page.
      void persistOverlaySettingsToServer(cleanSettings);
      set({
        scenes: dedupedFinal,
        activeSceneId: dedupedFinalActive.id,
        scene: dedupedFinalActive,
      });
      broadcastOverlayScene(dedupedFinalActive);
    });
  },

  saveSettings: () => {
    const { scenes, activeSceneId } = get();
    const settings = buildSettings(scenes, activeSceneId);
    writeOverlaySettings(settings);
    void persistOverlaySettingsToServer(settings);
  },

  setScene: (updater) =>
    set((state) => {
      const nextScene = withUpdatedScene(
        typeof updater === "function" ? updater(state.scene) : updater
      );
      const nextScenes = replaceScene(state.scenes, nextScene);
      broadcastOverlayScene(nextScene);
      writeOverlayScene(nextScene);
      const settings = buildSettings(nextScenes, nextScene.id);
      writeOverlaySettings(settings);
      void persistOverlaySettingsToServer(settings);
      return { scene: nextScene, scenes: nextScenes };
    }),

  createScene: (name = "New Scene") => {
    const trimmed = name.trim() || "New Scene";
    const duplicate = get().scenes.some(
      (s) => s.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) return `Ya existe una escena llamada "${trimmed}".`;
    set((state) => {
      const newScene = buildNewScene(trimmed);
      const nextScenes = [...state.scenes, newScene];
      const settings = buildSettings(nextScenes, newScene.id);
      writeOverlaySettings(settings);
      void persistOverlaySettingsToServer(settings);
      broadcastOverlayScene(newScene);
      writeOverlayScene(newScene);
      return {
        scenes: nextScenes,
        activeSceneId: newScene.id,
        scene: newScene,
        selectedWidgetId: null,
        selectedAssetId: null,
      };
    });
    return null;
  },

  switchScene: (sceneId) =>
    set((state) => {
      const target = state.scenes.find((s) => s.id === sceneId);
      if (!target || target.id === state.activeSceneId) return state;
      const settings = buildSettings(state.scenes, sceneId);
      writeOverlaySettings(settings);
      void persistOverlaySettingsToServer(settings);
      broadcastOverlayScene(target);
      writeOverlayScene(target);
      return {
        activeSceneId: sceneId,
        scene: target,
        selectedWidgetId: null,
        selectedAssetId: null,
      };
    }),

  renameScene: (sceneId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return "El nombre no puede estar vacío.";
    const duplicate = get().scenes.some(
      (s) => s.id !== sceneId && s.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) return `Ya existe una escena llamada "${trimmed}".`;
    set((state) => {
      const nextScenes = state.scenes.map((s) =>
        s.id === sceneId ? withUpdatedScene({ ...s, name: trimmed }) : s
      );
      const renamedScene = nextScenes.find((s) => s.id === sceneId)!;
      const settings = buildSettings(nextScenes, state.activeSceneId);
      writeOverlaySettings(settings);
      void persistOverlaySettingsToServer(settings);
      const nextScene = sceneId === state.activeSceneId ? renamedScene : state.scene;
      return { scenes: nextScenes, scene: nextScene };
    });
    return null;
  },

  duplicateScene: (sceneId) =>
    set((state) => {
      const source = state.scenes.find((s) => s.id === sceneId);
      if (!source) return state;
      const copy = cloneScene(source);
      copy.id = `scene-${Math.random().toString(36).slice(2, 10)}`;
      copy.name = `${source.name} Copy`;
      copy.updatedAt = new Date().toISOString();
      const nextScenes = [...state.scenes, copy];
      const settings = buildSettings(nextScenes, copy.id);
      writeOverlaySettings(settings);
      void persistOverlaySettingsToServer(settings);
      broadcastOverlayScene(copy);
      writeOverlayScene(copy);
      return {
        scenes: nextScenes,
        activeSceneId: copy.id,
        scene: copy,
        selectedWidgetId: null,
        selectedAssetId: null,
      };
    }),

  deleteScene: (sceneId) =>
    set((state) => {
      if (state.scenes.length <= 1) return state; // always keep at least one
      const nextScenes = state.scenes.filter((s) => s.id !== sceneId);
      const nextActiveId =
        state.activeSceneId === sceneId
          ? nextScenes[0].id
          : state.activeSceneId;
      const nextActive = nextScenes.find((s) => s.id === nextActiveId)!;
      const settings = buildSettings(nextScenes, nextActiveId);
      writeOverlaySettings(settings);
      void persistOverlaySettingsToServer(settings);
      if (state.activeSceneId === sceneId) {
        broadcastOverlayScene(nextActive);
        writeOverlayScene(nextActive);
      }
      return {
        scenes: nextScenes,
        activeSceneId: nextActiveId,
        scene: nextActive,
        selectedWidgetId: null,
        selectedAssetId: null,
      };
    }),

  resetScene: () => {
    const { activeSceneId, scenes } = get();
    const fresh = createDefaultScene();
    fresh.id = activeSceneId;
    fresh.widgets = []; // always reset to empty
    const nextScenes = replaceScene(scenes, fresh);
    const settings = buildSettings(nextScenes, activeSceneId);
    writeOverlaySettings(settings);
    void persistOverlaySettingsToServer(settings);
    broadcastOverlayScene(fresh);
    writeOverlayScene(fresh);
    set({ scene: fresh, scenes: nextScenes, selectedWidgetId: null, selectedAssetId: null });
  },

  selectWidget: (selectedWidgetId) => set({ selectedWidgetId }),

  addWidget: (kind) =>
    set((state) => {
      const highestZIndex = state.scene.widgets.reduce(
        (max, w) => Math.max(max, w.zIndex),
        0
      );
      const widget = createWidget(kind, highestZIndex + 1);
      const nextScene = withUpdatedScene({
        ...state.scene,
        widgets: [...state.scene.widgets, widget],
      });
      const nextScenes = replaceScene(state.scenes, nextScene);
      broadcastOverlayScene(nextScene);
      writeOverlayScene(nextScene);
      const settings = buildSettings(nextScenes, state.activeSceneId);
      writeOverlaySettings(settings);
      void persistOverlaySettingsToServer(settings);
      return { scene: nextScene, scenes: nextScenes, selectedWidgetId: widget.id };
    }),

  updateWidget: (widgetId, updater) =>
    set((state) => {
      const nextScene = withUpdatedScene({
        ...state.scene,
        widgets: state.scene.widgets.map((w) =>
          w.id === widgetId ? updater(w) : w
        ),
      });
      const nextScenes = replaceScene(state.scenes, nextScene);
      broadcastOverlayScene(nextScene);
      writeOverlayScene(nextScene);
      const settings = buildSettings(nextScenes, state.activeSceneId);
      writeOverlaySettings(settings);
      void persistOverlaySettingsToServer(settings);
      return { scene: nextScene, scenes: nextScenes };
    }),

  removeWidget: (widgetId) =>
    set((state) => {
      const nextScene = withUpdatedScene({
        ...state.scene,
        widgets: state.scene.widgets.filter((w) => w.id !== widgetId),
      });
      const nextScenes = replaceScene(state.scenes, nextScene);
      broadcastOverlayScene(nextScene);
      writeOverlayScene(nextScene);
      const settings = buildSettings(nextScenes, state.activeSceneId);
      writeOverlaySettings(settings);
      void persistOverlaySettingsToServer(settings);
      return {
        scene: nextScene,
        scenes: nextScenes,
        selectedWidgetId:
          state.selectedWidgetId === widgetId ? null : state.selectedWidgetId,
      };
    }),

  duplicateWidget: (widgetId) =>
    set((state) => {
      const source = state.scene.widgets.find((w) => w.id === widgetId);
      if (!source) return state;
      const highestZIndex = state.scene.widgets.reduce(
        (max, w) => Math.max(max, w.zIndex),
        0
      );
      const copy: OverlayWidget = JSON.parse(JSON.stringify(source));
      copy.id = `${source.id}-copy-${Math.random().toString(36).slice(2, 7)}`;
      copy.name = `${source.name} Copy`;
      copy.x += 28;
      copy.y += 28;
      copy.zIndex = highestZIndex + 1;
      const nextScene = withUpdatedScene({
        ...state.scene,
        widgets: [...state.scene.widgets, copy],
      });
      const nextScenes = replaceScene(state.scenes, nextScene);
      broadcastOverlayScene(nextScene);
      writeOverlayScene(nextScene);
      const settings = buildSettings(nextScenes, state.activeSceneId);
      writeOverlaySettings(settings);
      void persistOverlaySettingsToServer(settings);
      return { scene: nextScene, scenes: nextScenes, selectedWidgetId: copy.id };
    }),

  bringForward: (widgetId) =>
    set((state) => {
      // Sort by current zIndex, move the target one step up, re-assign 1..n
      const sorted = [...state.scene.widgets].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((w) => w.id === widgetId);
      if (idx < 0 || idx === sorted.length - 1) return state; // already on top
      // Swap with the next widget
      [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
      const reassigned = sorted.map((w, i) => ({ ...w, zIndex: i + 1 }));
      const nextScene = withUpdatedScene({ ...state.scene, widgets: reassigned });
      const nextScenes = replaceScene(state.scenes, nextScene);
      broadcastOverlayScene(nextScene);
      writeOverlayScene(nextScene);
      const settings = buildSettings(nextScenes, state.activeSceneId);
      writeOverlaySettings(settings);
      void persistOverlaySettingsToServer(settings);
      return { scene: nextScene, scenes: nextScenes };
    }),

  sendBackward: (widgetId) =>
    set((state) => {
      // Sort by current zIndex, move the target one step down, re-assign 1..n
      const sorted = [...state.scene.widgets].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((w) => w.id === widgetId);
      if (idx <= 0) return state; // already at bottom
      // Swap with the previous widget
      [sorted[idx], sorted[idx - 1]] = [sorted[idx - 1], sorted[idx]];
      const reassigned = sorted.map((w, i) => ({ ...w, zIndex: i + 1 }));
      const nextScene = withUpdatedScene({ ...state.scene, widgets: reassigned });
      const nextScenes = replaceScene(state.scenes, nextScene);
      broadcastOverlayScene(nextScene);
      writeOverlayScene(nextScene);
      const settings = buildSettings(nextScenes, state.activeSceneId);
      writeOverlaySettings(settings);
      void persistOverlaySettingsToServer(settings);
      return { scene: nextScene, scenes: nextScenes };
    }),

  selectAsset: (selectedAssetId) => set({ selectedAssetId }),

  addAsset: (asset) =>
    set((state) => {
      const nextScene = withUpdatedScene({
        ...state.scene,
        assets: [asset, ...state.scene.assets],
      });
      const nextScenes = replaceScene(state.scenes, nextScene);
      broadcastOverlayScene(nextScene);
      writeOverlayScene(nextScene);
      const settings = buildSettings(nextScenes, state.activeSceneId);
      writeOverlaySettings(settings);
      void persistOverlaySettingsToServer(settings);
      return { scene: nextScene, scenes: nextScenes, selectedAssetId: asset.id };
    }),

  removeAsset: (assetId) =>
    set((state) => {
      const nextScene = withUpdatedScene({
        ...state.scene,
        assets: state.scene.assets.filter((a) => a.id !== assetId),
        widgets: state.scene.widgets.map((w) => ({
          ...w,
          sound: {
            ...w.sound,
            assetId: w.sound.assetId === assetId ? null : w.sound.assetId,
          },
          assets: {
            primaryAssetId:
              w.assets.primaryAssetId === assetId ? null : w.assets.primaryAssetId,
            secondaryAssetId:
              w.assets.secondaryAssetId === assetId ? null : w.assets.secondaryAssetId,
          },
        })),
        backgroundAssetId:
          state.scene.backgroundAssetId === assetId
            ? null
            : state.scene.backgroundAssetId,
      });
      const nextScenes = replaceScene(state.scenes, nextScene);
      broadcastOverlayScene(nextScene);
      writeOverlayScene(nextScene);
      const settings = buildSettings(nextScenes, state.activeSceneId);
      writeOverlaySettings(settings);
      void persistOverlaySettingsToServer(settings);
      return {
        scene: nextScene,
        scenes: nextScenes,
        selectedAssetId:
          state.selectedAssetId === assetId ? null : state.selectedAssetId,
      };
    }),
}));

export function getSelectedWidget(
  scene: OverlaySceneConfig,
  widgetId: string | null
): OverlayWidget | null {
  if (!widgetId) return null;
  return scene.widgets.find((w) => w.id === widgetId) ?? null;
}
