import React from "react";

const statusConfig = {
  OPEN: {
    label: "Open",
    text: "text-statusgreen-text",
    bg: "bg-statusgreen-bg",
    dot: "bg-statusgreen-bar",
    bar: "bg-statusgreen-bar",
  },
  "CLOSING SOON": {
    label: "Closing Soon",
    text: "text-statusgold-text",
    bg: "bg-statusgold-bg",
    dot: "bg-statusgold-bar",
    bar: "bg-statusgold-bar",
  },
  EXPIRED: {
    label: "Expired",
    text: "text-statusred-text",
    bg: "bg-statusred-bg",
    dot: "bg-statusred-bar",
    bar: "bg-statusred-bar",
  },
};

export function getStatusConfig(status) {
  return statusConfig[status] || statusConfig.OPEN;
}

export default function StatusBadge({ status }) {
  const cfg = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
