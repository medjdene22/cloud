"use client";

import { memo } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import { Cloud, Network } from "lucide-react";

export type GroupNodeData = {
  label: string;
  description: string;
  color: string;
  icon: string;
  provider: string;
  category: string;
  groupType: "vpc" | "public-subnet" | "private-subnet";
};

type GroupNodeProps = NodeProps & {
  data: GroupNodeData;
};

const groupConfig: Record<
  string,
  { badge: string; borderStyle: string; bgOpacity: string; Icon: typeof Cloud }
> = {
  vpc: {
    badge: "VPC",
    borderStyle: "border-dashed",
    bgOpacity: "06",
    Icon: Cloud,
  },
  "public-subnet": {
    badge: "Public Subnet",
    borderStyle: "border-dashed",
    bgOpacity: "04",
    Icon: Network,
  },
  "private-subnet": {
    badge: "Private Subnet",
    borderStyle: "border-dotted",
    bgOpacity: "04",
    Icon: Network,
  },
};

function GroupNodeComponent({ data, selected }: GroupNodeProps) {
  const config = groupConfig[data.groupType] || groupConfig.vpc;
  const { Icon } = config;

  return (
    <>
      <NodeResizer
        minWidth={280}
        minHeight={200}
        isVisible={selected}
        lineClassName="!border-primary"
        handleClassName="!w-2.5 !h-2.5 !bg-primary !border-2 !border-card !rounded-sm"
      />

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
          w-full h-full rounded-xl ${config.borderStyle} border-2 
          transition-all duration-200 relative
          ${selected ? "border-primary" : "border-node-border"}
        `}
        style={{
          backgroundColor: `${data.color}${config.bgOpacity}`,
          minWidth: 280,
          minHeight: 200,
        }}
      >
        {/* Header badge */}
        <div
          className="absolute -top-px left-4 -translate-y-1/2 flex items-center gap-1.5 
            px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider
            border"
          style={{
            backgroundColor: `${data.color}18`,
            borderColor: `${data.color}40`,
            color: data.color,
          }}
        >
          <Icon className="w-3 h-3" />
          {data.label}
        </div>

        {/* Availability Zone / CIDR hint */}
        <div className="absolute top-2.5 right-3">
          <span
            className="text-[9px] font-mono tracking-wide opacity-50"
            style={{ color: data.color }}
          >
            {data.groupType === "vpc"
              ? "10.0.0.0/16"
              : data.groupType === "public-subnet"
                ? "10.0.1.0/24"
                : "10.0.2.0/24"}
          </span>
        </div>

        {/* Drop zone hint when empty */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-[10px] text-muted-foreground/30 select-none">
            Drop components here
          </p>
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

export const GroupNode = memo(GroupNodeComponent);
