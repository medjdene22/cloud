"use client";

import { useState, useRef, useEffect } from "react";
import type { Node, Edge } from "@xyflow/react";
import {
  Trash2,
  Download,
  Layers,
  GitBranch,
  FileJson,
  FileText,
  FileCode2,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  exportToJSON,
  exportToTerraform,
  exportToPDF,
  downloadFile,
} from "@/lib/export-utils";

interface ToolbarProps {
  nodeCount: number;
  edgeCount: number;
  nodes: Node[];
  edges: Edge[];
  onClearCanvas: () => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export function Toolbar({
  nodeCount,
  edgeCount,
  nodes,
  edges,
  onClearCanvas,
  onDeleteSelected,
  hasSelection,
  canvasRef,
}: ToolbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as HTMLElement)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const handleExportJSON = () => {
    const json = exportToJSON(nodes, edges);
    downloadFile(json, "architecture.json", "application/json");
    setDropdownOpen(false);
  };

  const handleExportTerraform = () => {
    const tf = exportToTerraform(nodes, edges);
    downloadFile(tf, "main.tf", "text/plain");
    setDropdownOpen(false);
  };

  const handleExportPDF = async () => {
    if (!canvasRef.current) return;
    setExporting("pdf");
    setDropdownOpen(false);
    try {
      // Find the ReactFlow container
      const flowEl = canvasRef.current.querySelector<HTMLElement>(".react-flow");
      if (flowEl) {
        await exportToPDF(flowEl, nodes);
      }
    } finally {
      setExporting(null);
    }
  };

  const exportOptions = [
    {
      id: "json",
      label: "Architecture JSON",
      description: "Full architecture with nodes, edges & metadata",
      icon: FileJson,
      action: handleExportJSON,
      color: "#3ecf8e",
    },
    {
      id: "terraform",
      label: "Terraform (HCL)",
      description: "AWS provider resources as .tf file",
      icon: FileCode2,
      action: handleExportTerraform,
      color: "#7b61ff",
    },
    {
      id: "pdf",
      label: "PDF Document",
      description: "Visual diagram export with component list",
      icon: FileText,
      action: handleExportPDF,
      color: "#ef4444",
    },
  ];

  return (
    <header className="h-12 bg-card border-b border-border flex items-center justify-between px-4">
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-primary-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
              />
            </svg>
          </div>
          <span className="text-sm font-bold text-foreground tracking-tight">
            CloudForge
          </span>
        </div>

        <div className="w-px h-5 bg-border" />

        <span className="text-xs text-muted-foreground font-mono">
          Untitled Architecture
        </span>
      </div>

      {/* Center: Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Layers className="w-3.5 h-3.5" />
          <span className="font-mono">{nodeCount}</span>
          <span>nodes</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <GitBranch className="w-3.5 h-3.5" />
          <span className="font-mono">{edgeCount}</span>
          <span>connections</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {hasSelection && (
          <button
            onClick={onDeleteSelected}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
              text-destructive-foreground bg-destructive/10 hover:bg-destructive/20 
              border border-destructive/20 transition-colors"
            title="Delete selected"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        )}

        {/* Export Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            disabled={nodeCount === 0 || exporting !== null}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
              text-foreground hover:bg-accent border border-border transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed"
            title="Export architecture"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Export</span>
            <ChevronDown
              className={`w-3 h-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-72 rounded-lg border border-border 
                bg-card shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
            >
              <div className="px-3 py-2 border-b border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Export as
                </p>
              </div>
              <div className="p-1">
                {exportOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={opt.action}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md 
                      text-left hover:bg-accent transition-colors group"
                  >
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${opt.color}15` }}
                    >
                      <opt.icon
                        className="w-4 h-4"
                        style={{ color: opt.color }}
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-foreground">
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {opt.description}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="px-3 py-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground">
                  {nodeCount} nodes, {edgeCount} connections
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClearCanvas}
          disabled={nodeCount === 0}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
            text-muted-foreground hover:text-foreground hover:bg-accent 
            border border-transparent hover:border-border transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed"
          title="Clear canvas"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      </div>
    </header>
  );
}
