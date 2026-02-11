import { COLOR } from "@/constants/colors";
import type { RepoWorkflowAction } from "@/constants/repo-workflow-actions";
import {
  REPO_WORKFLOW_COLOR,
  REPO_WORKFLOW_LABEL,
  type RepoWorkflowStatus,
} from "@/constants/repo-workflow-status";
import type { RepoWorkflowInfo } from "@/core/repo-workflow";
import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";

export interface BreadcrumbBarProps {
  info: RepoWorkflowInfo | null;
  loading: boolean;
  showAction: boolean;
  onActionPress: (skill: string) => void;
  compact?: boolean;
}

export function BreadcrumbBar({
  info,
  loading,
  showAction,
  onActionPress: _onActionPress,
  compact: _compact = false,
}: BreadcrumbBarProps): ReactNode {
  if (loading && !info) {
    return (
      <box
        width="100%"
        flexDirection="row"
        paddingLeft={1}
        paddingRight={1}
        paddingTop={0}
        paddingBottom={0}
      >
        <text fg={COLOR.DIM}>Loading repo…</text>
      </box>
    );
  }

  if (!info) {
    return null;
  }

  const statusLabel = REPO_WORKFLOW_LABEL[info.status as RepoWorkflowStatus];
  const statusColor = REPO_WORKFLOW_COLOR[info.status as RepoWorkflowStatus];
  const action: RepoWorkflowAction = info.action;

  const prSuffix = info.prNumber != null ? ` (PR #${info.prNumber})` : "";

  return (
    <box
      width="100%"
      flexDirection="row"
      alignItems="center"
      paddingLeft={1}
      paddingRight={1}
      paddingTop={0}
      paddingBottom={0}
      gap={1}
    >
      <text>
        <span fg={COLOR.WHITE}>{info.owner}</span>
        <span fg={COLOR.DIM}> &gt; </span>
        <span fg={COLOR.WHITE}>{info.repoName}</span>
        <span fg={COLOR.DIM}> &gt; </span>
        <span fg={COLOR.CYAN}>{info.branch}</span>
        <span fg={COLOR.DIM}> &gt; </span>
        <span fg={statusColor} attributes={TextAttributes.BOLD}>
          {statusLabel}
        </span>
        {prSuffix ? <span fg={COLOR.DIM}>{prSuffix}</span> : null}
      </text>
      {showAction && action ? (
        <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
          [{action.label} →]
        </text>
      ) : null}
    </box>
  );
}
