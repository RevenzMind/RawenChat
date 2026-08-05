"use client";

import React, { useMemo } from "react";
import * as Babel from "@babel/standalone";

type CompiledComponent = React.ComponentType<Record<string, unknown>>;

export class MessageErrorBoundary extends React.Component<
  { children: React.ReactNode; resetKey: string },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode; resetKey: string }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Render error in custom component:", error, info);
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="text-red-500 p-4 text-sm">
          Error al renderizar: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

export const DEFAULT_COMPONENT_CODE = `({ msg, ShowTime = true }) => {
  const color = msg.color || "#ff9d6c";
  const isHex = color.startsWith("#") && color.length === 7;
  const tint = isHex ? color + "1f" : "rgba(255,157,108,0.12)";
  const ring = isHex ? color + "40" : "rgba(255,157,108,0.25)";
  const initial = (msg.username || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="animate-message-in px-1 py-[3px]">
      <div className="message-container group flex items-start gap-3 px-2.5 py-2 rounded-md transition-colors duration-150 hover:bg-[rgba(255,255,255,0.04)]">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center text-[13px] font-bold shrink-0 mt-[3px] select-none"
          style={{ backgroundColor: tint, color: color, boxShadow: "inset 0 0 0 1px " + ring }}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span
              className="username font-semibold text-[13px] tracking-[-0.01em] truncate"
              style={{ color: color }}
            >
              {msg.username}
            </span>
            {ShowTime && (
              <span className="text-[10px] font-mono text-[rgba(255,255,255,0.28)] tabular-nums shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {new Date(msg.timestamp).toLocaleTimeString("es-MX", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
          <p className="message-text text-[14px] text-[rgba(255,255,255,0.92)] leading-[1.45] break-words mt-[1px]">
            {msg.parts && msg.parts.length > 0
              ? msg.parts.map((part, i) =>
                  part.type === "emote" ? (
                    <img
                      key={i}
                      src={part.url}
                      alt={part.code}
                      title={part.code}
                      className="emote-img inline-block w-6 h-6 align-[-6px] mx-px select-none"
                    />
                  ) : (
                    <span key={i}>{part.text}</span>
                  )
                )
              : msg.message}
          </p>
        </div>
      </div>
    </div>
  );
}`;

function stripSpacesInBrackets(code: string): string {
  return code.replace(/\[([^\]]+)\]/g, (match, inner: string) => {
    if (/[(),]/.test(inner)) return match;
    return `[${inner.replace(/\s+/g, "")}]`;
  });
}

function compileJSXComponent(rawCode: string): CompiledComponent {
  const source = stripSpacesInBrackets(rawCode.trim());

  const transpiled = Babel.transform(source, {
    presets: [
      ["react", { runtime: "classic" }],
      ["typescript", { ignoreExtensions: true }],
    ],
  }).code;

  if (!transpiled) {
    throw new Error("Transpilation failed");
  }

  const body = transpiled.trim().replace(/;$/, "");
  return new Function("React", `return ${body}`)(React);
}

export function useCustomRenderableComponent(
  rawCode: string | null | undefined,
  fallbackCode: string
) {
  return useMemo(() => {
    const userCode = (rawCode ?? "").trim();

    let Inner: CompiledComponent;
    let resetKey: string;

    try {
      Inner = compileJSXComponent(userCode || fallbackCode);
      resetKey = userCode || fallbackCode;
    } catch (e) {
      console.error("Error compiling custom component, using default:", e);
      try {
        Inner = compileJSXComponent(fallbackCode);
        resetKey = fallbackCode;
      } catch {
        const message = (e as Error).message;
        return function CompileErrorFallback() {
          return (
            <div className="text-red-500 p-4 text-sm">
              Error en el código: {message}
            </div>
          );
        };
      }
    }

    return function CustomMessageComponent(props: Record<string, unknown>) {
      return (
        <div className="tailwind-root">
          <MessageErrorBoundary resetKey={resetKey}>
            <Inner {...props} />
          </MessageErrorBoundary>
        </div>
      );
    };
  }, [fallbackCode, rawCode]);
}

export function useCustomMessageComponent(rawCode: string | null | undefined) {
  return useCustomRenderableComponent(rawCode, DEFAULT_COMPONENT_CODE);
}
