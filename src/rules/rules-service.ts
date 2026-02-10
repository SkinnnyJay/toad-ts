import type { PermissionRules } from "@/rules/permission-rules";
import type { RuleDocument } from "@/rules/rules-loader";

export interface RulesState {
  rules: RuleDocument[];
  permissions: PermissionRules;
}

let activeRules: RulesState = {
  rules: [],
  permissions: {},
};

export const setRulesState = (state: RulesState): void => {
  activeRules = state;
};

export const getRulesState = (): RulesState => activeRules;
