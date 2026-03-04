"use client";

import { useState, useMemo, type DragEvent } from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import {
  cloudComponents,
  categories,
  type CloudComponent,
  type CloudCategory,
} from "@/lib/cloud-components";

interface ComponentPaletteProps {
  onAddNode: (component: CloudComponent, position: { x: number; y: number }) => void;
}

function DraggableComponent({ component }: { component: CloudComponent }) {
  const onDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData(
      "application/cloud-component",
      JSON.stringify(component)
    );
    event.dataTransfer.effectAllowed = "move";
  };

  const isGroup = component.isGroup;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`group flex items-center gap-2.5 px-3 py-2 rounded-md cursor-grab 
        active:cursor-grabbing transition-all duration-150
        hover:bg-accent border hover:border-border
        ${isGroup ? "border-dashed border-border/50" : "border-transparent"}`}
    >
      <div
        className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${isGroup ? "border border-dashed" : ""}`}
        style={{
          backgroundColor: `${component.color}15`,
          borderColor: isGroup ? `${component.color}40` : undefined,
        }}
      >
        <div
          className="w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: component.color }}
        />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-foreground leading-tight truncate flex items-center gap-1.5">
          {component.label}
          {isGroup && (
            <span
              className="text-[8px] px-1 py-px rounded font-mono uppercase tracking-wider"
              style={{
                backgroundColor: `${component.color}18`,
                color: component.color,
              }}
            >
              group
            </span>
          )}
        </span>
        <span className="text-[10px] text-muted-foreground leading-tight truncate">
          {component.description}
        </span>
      </div>
    </div>
  );
}

export function ComponentPalette({ onAddNode: _onAddNode }: ComponentPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<
    Set<CloudCategory>
  >(new Set(Object.keys(categories) as CloudCategory[]));

  const filteredComponents = useMemo(() => {
    if (!searchQuery.trim()) return cloudComponents;
    const query = searchQuery.toLowerCase();
    return cloudComponents.filter(
      (c) =>
        c.label.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const groupedComponents = useMemo(() => {
    const groups: Partial<Record<CloudCategory, CloudComponent[]>> = {};
    for (const component of filteredComponents) {
      if (!groups[component.category]) {
        groups[component.category] = [];
      }
      groups[component.category]!.push(component);
    }
    return groups;
  }, [filteredComponents]);

  const toggleCategory = (category: CloudCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <aside className="w-72 bg-sidebar border-r border-sidebar-border flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-sm font-semibold text-sidebar-foreground mb-3">
          Components
        </h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-secondary text-foreground text-xs rounded-md pl-8 pr-3 py-2 
              placeholder:text-muted-foreground border border-border
              focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary
              transition-colors"
          />
        </div>
      </div>

      {/* Component List */}
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(groupedComponents).map(([category, components]) => {
          const cat = category as CloudCategory;
          const isExpanded = expandedCategories.has(cat);
          const catMeta = categories[cat];

          return (
            <div key={category} className="mb-1">
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium 
                  text-muted-foreground hover:text-foreground transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: catMeta.color }}
                />
                <span className="uppercase tracking-wider text-[10px]">
                  {catMeta.label}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {components?.length}
                </span>
              </button>

              {isExpanded && components && (
                <div className="ml-1 flex flex-col gap-0.5">
                  {components.map((component) => (
                    <DraggableComponent
                      key={component.id}
                      component={component}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(groupedComponents).length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Search className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs">No components found</span>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="p-3 border-t border-sidebar-border">
        <p className="text-[10px] text-muted-foreground leading-relaxed text-center">
          Drag components onto the canvas to start building
        </p>
      </div>
    </aside>
  );
}
