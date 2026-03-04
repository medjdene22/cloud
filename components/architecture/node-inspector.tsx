"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Node } from "@xyflow/react";
import type { CloudNodeData } from "./cloud-node";
import type { GroupNodeData } from "./group-node";
import { categories, type CloudCategory } from "@/lib/cloud-components";
import { getConnectionHints } from "@/lib/connection-rules";
import { ArrowRight, Info } from "lucide-react";

interface NodeInspectorProps {
  node: Node;
  onUpdateLabel: (nodeId: string, label: string) => void;
  onClose: () => void;
}

export function NodeInspector({
  node,
  onUpdateLabel,
  onClose,
}: NodeInspectorProps) {
  const data = node.data as CloudNodeData & Partial<GroupNodeData>;
  const [label, setLabel] = useState(data.label);
  const catMeta = categories[data.category as CloudCategory];
  const isGroup = node.type === "groupNode";

  useEffect(() => {
    setLabel(data.label);
  }, [data.label]);

  const handleLabelChange = (value: string) => {
    setLabel(value);
    onUpdateLabel(node.id, value);
  };

  return (
    <aside className="w-64 bg-sidebar border-l border-sidebar-border flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <h3 className="text-xs font-semibold text-sidebar-foreground uppercase tracking-wider">
          Inspector
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Component Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${data.color}18` }}
          >
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: data.color }}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              {data.label}
              {isGroup && (
                <span
                  className="text-[8px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider border border-dashed"
                  style={{
                    backgroundColor: `${data.color}18`,
                    borderColor: `${data.color}40`,
                    color: data.color,
                  }}
                >
                  {data.groupType || "group"}
                </span>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
              {data.provider}
            </p>
          </div>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">
            Display Name
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="w-full bg-secondary text-foreground text-xs rounded-md px-3 py-2 
              border border-border focus:outline-none focus:ring-1 focus:ring-primary 
              focus:border-primary transition-colors"
          />
        </div>

        {/* Details */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">
              Description
            </label>
            <p className="text-xs text-foreground leading-relaxed">
              {data.description}
            </p>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">
              Category
            </label>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: catMeta?.color }}
              />
              <span className="text-xs text-foreground">{catMeta?.label}</span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">
              Node ID
            </label>
            <p className="text-xs text-muted-foreground font-mono">{node.id}</p>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">
              Position
            </label>
            <p className="text-xs text-muted-foreground font-mono">
              x: {Math.round(node.position.x)}, y:{" "}
              {Math.round(node.position.y)}
            </p>
          </div>
        </div>

        {/* Connection Hints */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-1.5 mb-3">
            <Info className="w-3 h-3 text-muted-foreground" />
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Connection Rules
            </label>
          </div>
          <div className="flex flex-col gap-2">
            {getConnectionHints(data).map((hint, i) => (
              <div key={i} className="flex items-start gap-2">
                <ArrowRight className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                <p className="text-[11px] text-secondary-foreground leading-relaxed">
                  {hint}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
