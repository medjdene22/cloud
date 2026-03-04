"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { ArchitectureCanvas } from "@/components/architecture/architecture-canvas";

export default function Page() {
  return (
    <ReactFlowProvider>
      <ArchitectureCanvas />
    </ReactFlowProvider>
  );
}
