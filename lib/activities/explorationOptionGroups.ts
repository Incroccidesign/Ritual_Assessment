import { ExplorationActivity, ExplorationOptionGroup } from "@/types/activity";

export type GroupedExplorationOption = {
  index: number;
  label: string;
  id: string;
  groupId?: string;
  groupLabel?: string;
};

export type GroupedExplorationOptions = {
  group: ExplorationOptionGroup | null;
  options: GroupedExplorationOption[];
};

export function orderedOptionGroups(activity: ExplorationActivity) {
  return [...(activity.optionGroups ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
}

export function optionGroupIdFor(activity: ExplorationActivity, optionIndex: number) {
  const groupId = activity.optionGroupAssignments?.[String(optionIndex)];
  return groupId && activity.optionGroups?.some((group) => group.id === groupId) ? groupId : undefined;
}

export function optionGroupLabelFor(activity: ExplorationActivity, optionIndex: number) {
  const groupId = optionGroupIdFor(activity, optionIndex);
  return groupId ? activity.optionGroups?.find((group) => group.id === groupId)?.label : undefined;
}

export function findOptionGroupForValue(activity: ExplorationActivity, value: string) {
  const normalizedValue = normalizeOptionValue(value);
  const optionIndex = activity.options.findIndex((option) => normalizeOptionValue(option) === normalizedValue);
  if (optionIndex < 0) return undefined;
  return optionGroupLabelFor(activity, optionIndex);
}

export function groupedExplorationOptions(activity: ExplorationActivity, includeEmptyGroups = false): GroupedExplorationOptions[] {
  const groups = orderedOptionGroups(activity);
  const grouped = new Map<string, GroupedExplorationOption[]>();
  const ungrouped: GroupedExplorationOption[] = [];

  activity.options.forEach((label, index) => {
    if (!label) return;
    const groupId = optionGroupIdFor(activity, index);
    const item = {
      index,
      label,
      id: `${activity.id}_option_${index}`,
      groupId,
      groupLabel: groupId ? groups.find((group) => group.id === groupId)?.label : undefined
    };
    if (!groupId) {
      ungrouped.push(item);
      return;
    }
    const items = grouped.get(groupId) ?? [];
    items.push(item);
    grouped.set(groupId, items);
  });

  return [
    ...groups
      .map((group) => ({ group, options: grouped.get(group.id) ?? [] }))
      .filter((item) => includeEmptyGroups || item.options.length > 0),
    ...(ungrouped.length ? [{ group: null, options: ungrouped }] : [])
  ];
}

function normalizeOptionValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
