"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Server,
  Zap,
  Box,
  HardDrive,
  Folder,
  Database,
  Table,
  Cloud,
  Globe,
  Shield,
  Bell,
  Search,
  User,
  Smartphone,
  Monitor,
  Split,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  server: Server,
  zap: Zap,
  "zap-cache": Zap,
  container: Box,
  kubernetes: Box,
  box: Box,
  bucket: Database,
  "hard-drive": HardDrive,
  folder: Folder,
  database: Database,
  "database-star": Database,
  table: Table,
  cloud: Cloud,
  globe: Globe,
  signpost: Globe,
  split: Split,
  gateway: Split,
  shield: Shield,
  "user-shield": Shield,
  firewall: Shield,
  queue: Box,
  bell: Bell,
  workflow: Zap,
  steps: Zap,
  stream: Zap,
  warehouse: Database,
  search: Search,
  user: User,
  smartphone: Smartphone,
  monitor: Monitor,
};

export type CloudNodeData = {
  label: string;
  description: string;
  color: string;
  icon: string;
  provider: string;
  category: string;
};

type CloudNodeProps = NodeProps & {
  data: CloudNodeData;
};

function CloudNodeComponent({ data, selected }: CloudNodeProps) {
  const Icon = iconMap[data.icon] || Box;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!bg-muted-foreground !border-card !w-2 !h-2"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!bg-muted-foreground !border-card !w-2 !h-2"
      />

      <div
        className={`
          group relative flex items-center gap-3 rounded-lg px-4 py-3
          border-2 transition-all duration-200
          bg-card text-card-foreground
          min-w-[160px] max-w-[220px]
          ${selected ? "border-primary shadow-[0_0_20px_rgba(62,207,142,0.15)]" : "border-node-border hover:border-muted-foreground"}
        `}
      >
        {/* Color accent bar */}
        <div
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
          style={{ backgroundColor: data.color }}
        />

        {/* Icon */}
        <div
          className="flex items-center justify-center w-9 h-9 rounded-md shrink-0"
          style={{ backgroundColor: `${data.color}18` }}
        >
          <Icon className="w-5 h-5" style={{ color: data.color }} />
        </div>

        {/* Label & Description */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold text-foreground leading-tight truncate">
            {data.label}
          </span>
          <span className="text-[10px] text-muted-foreground leading-tight truncate uppercase tracking-wider font-mono">
            {data.provider}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!bg-muted-foreground !border-card !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="!bg-muted-foreground !border-card !w-2 !h-2"
      />
    </>
  );
}

export const CloudNode = memo(CloudNodeComponent);
