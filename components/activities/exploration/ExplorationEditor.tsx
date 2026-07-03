"use client";

import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ElementType, ExplorationActivity, ExplorationResponseMode } from "@/types/activity";
import { Button, Field, inputClass, selectClass, SubtlePanel } from "@/components/ritual-ui";
import { groupedExplorationOptions, orderedOptionGroups, optionGroupIdFor } from "@/lib/activities/explorationOptionGroups";
import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/lib/utils/cn";
import { uid } from "@/lib/utils/ids";

const elementTypes: ElementType[] = ["problems", "objectives", "criticalities", "barriers", "opportunities", "other"];
const responseModes: ExplorationResponseMode[] = ["closed_list", "open_list", "free_input"];

export function ExplorationEditor({
  activity,
  onChange
}: {
  activity: ExplorationActivity;
  onChange: (activity: ExplorationActivity) => void;
}) {
  const { messages } = useLocale();
  const [openGroupMenu, setOpenGroupMenu] = useState<string | null>(null);
  const [openOptionMenu, setOpenOptionMenu] = useState<number | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const groups = orderedOptionGroups(activity);
  const groupedOptions = groupedExplorationOptions(activity, true);

  function updateOptions(options: string[], assignments = activity.optionGroupAssignments ?? {}) {
    onChange({ ...activity, options, optionGroupAssignments: cleanAssignments(assignments, options.length) });
  }

  function updateOption(index: number, value: string) {
    const next = [...activity.options];
    next[index] = value;
    updateOptions(next);
  }

  function addOption(groupId?: string) {
    const nextIndex = activity.options.length;
    const assignments = { ...(activity.optionGroupAssignments ?? {}) };
    if (groupId) assignments[String(nextIndex)] = groupId;
    onChange({
      ...activity,
      options: [...activity.options, ""],
      optionGroupAssignments: assignments
    });
  }

  function removeOption(index: number) {
    const nextOptions = activity.options.filter((_, itemIndex) => itemIndex !== index);
    const nextAssignments: Record<string, string> = {};
    Object.entries(activity.optionGroupAssignments ?? {}).forEach(([key, groupId]) => {
      const optionIndex = Number(key);
      if (!Number.isFinite(optionIndex) || optionIndex === index) return;
      nextAssignments[String(optionIndex > index ? optionIndex - 1 : optionIndex)] = groupId;
    });
    onChange({ ...activity, options: nextOptions, optionGroupAssignments: cleanAssignments(nextAssignments, nextOptions.length) });
    setOpenOptionMenu(null);
  }

  function moveOption(index: number, direction: -1 | 1) {
    const groupId = optionGroupIdFor(activity, index) ?? "";
    const candidateIndexes = activity.options
      .map((_, itemIndex) => itemIndex)
      .filter((itemIndex) => (optionGroupIdFor(activity, itemIndex) ?? "") === groupId);
    const currentPosition = candidateIndexes.indexOf(index);
    const targetIndex = candidateIndexes[currentPosition + direction];
    if (targetIndex === undefined) return;
    const nextOptions = [...activity.options];
    [nextOptions[index], nextOptions[targetIndex]] = [nextOptions[targetIndex], nextOptions[index]];

    const assignments = { ...(activity.optionGroupAssignments ?? {}) };
    const currentGroup = assignments[String(index)];
    const targetGroup = assignments[String(targetIndex)];
    if (targetGroup) assignments[String(index)] = targetGroup;
    else delete assignments[String(index)];
    if (currentGroup) assignments[String(targetIndex)] = currentGroup;
    else delete assignments[String(targetIndex)];

    onChange({ ...activity, options: nextOptions, optionGroupAssignments: cleanAssignments(assignments, nextOptions.length) });
  }

  function assignOptionToGroup(index: number, groupId?: string) {
    const assignments = { ...(activity.optionGroupAssignments ?? {}) };
    if (groupId) assignments[String(index)] = groupId;
    else delete assignments[String(index)];
    onChange({ ...activity, optionGroupAssignments: cleanAssignments(assignments, activity.options.length) });
    setOpenOptionMenu(null);
  }

  function addGroup() {
    const nextGroup = {
      id: uid("option_group"),
      label: messages.activities.exploration.newGroup,
      orderIndex: groups.length
    };
    onChange({
      ...activity,
      optionGroups: [...groups, nextGroup]
    });
  }

  function updateGroupLabel(groupId: string, label: string) {
    onChange({
      ...activity,
      optionGroups: groups.map((group) => group.id === groupId ? { ...group, label } : group)
    });
  }

  function moveGroup(groupId: string, direction: -1 | 1) {
    const currentIndex = groups.findIndex((group) => group.id === groupId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= groups.length) return;
    const nextGroups = [...groups];
    [nextGroups[currentIndex], nextGroups[targetIndex]] = [nextGroups[targetIndex], nextGroups[currentIndex]];
    onChange({
      ...activity,
      optionGroups: nextGroups.map((group, index) => ({ ...group, orderIndex: index }))
    });
    setOpenGroupMenu(null);
  }

  function removeGroup(groupId: string) {
    const assignments = { ...(activity.optionGroupAssignments ?? {}) };
    Object.entries(assignments).forEach(([key, value]) => {
      if (value === groupId) delete assignments[key];
    });
    onChange({
      ...activity,
      optionGroups: groups.filter((group) => group.id !== groupId).map((group, index) => ({ ...group, orderIndex: index })),
      optionGroupAssignments: cleanAssignments(assignments, activity.options.length)
    });
    setOpenGroupMenu(null);
  }

  function toggleGroup(groupId: string) {
    setCollapsedGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={messages.activities.exploration.elementType}>
          <select
            className={selectClass}
            value={activity.itemType}
            onChange={(event) => onChange({ ...activity, itemType: event.target.value as ElementType })}
          >
            {elementTypes.map((type) => (
              <option key={type} value={type}>{messages.activityTypes[type]}</option>
            ))}
          </select>
        </Field>
        <Field label={messages.activities.exploration.responseMode}>
          <select
            className={selectClass}
            value={activity.responseMode}
            onChange={(event) => {
              const responseMode = event.target.value as ExplorationResponseMode;
              onChange({ ...activity, responseMode, allowOther: responseMode === "free_input" ? false : activity.allowOther });
            }}
          >
            {responseModes.map((mode) => (
              <option key={mode} value={mode}>{messages.activityTypes[mode]}</option>
            ))}
          </select>
        </Field>
      </div>
      {activity.responseMode !== "free_input" ? (
        <SubtlePanel className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bone/45">{messages.activities.exploration.options}</p>
            <Button type="button" variant="secondary" className="min-h-9 px-3" onClick={addGroup}>
              <Plus size={15} /> {messages.activities.exploration.addGroup}
            </Button>
          </div>

          <div className="space-y-5">
            {groupedOptions.map(({ group, options }) => {
              const isUngrouped = !group;
              const isCollapsed = group ? Boolean(collapsedGroups[group.id]) : false;
              return (
                <div key={group?.id ?? "ungrouped"} className={isUngrouped ? "space-y-3" : "space-y-3 border-t border-bone/10 pt-4 first:border-t-0 first:pt-0"}>
                  {group ? (
                    <div className="relative flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-md p-2 text-bone/50 transition hover:bg-bone/8 hover:text-bone"
                        onClick={() => toggleGroup(group.id)}
                        aria-label={isCollapsed ? messages.activities.exploration.expandGroup : messages.activities.exploration.collapseGroup}
                      >
                        {isCollapsed ? <ChevronRight size={17} /> : <ChevronDown size={17} />}
                      </button>
                      <input
                        className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-2 text-sm font-semibold text-bone outline-none transition hover:border-bone/12 focus:border-mint focus:bg-night/55"
                        value={group.label}
                        placeholder={messages.activities.exploration.groupName}
                        onChange={(event) => updateGroupLabel(group.id, event.target.value)}
                      />
                      <span className="shrink-0 text-xs font-semibold text-bone/38">
                        {options.length} {options.length === 1 ? messages.activities.exploration.optionSingular : messages.activities.exploration.optionPlural}
                      </span>
                      <button
                        type="button"
                        className="rounded-md p-2 text-bone/50 transition hover:bg-bone/8 hover:text-bone"
                        onClick={() => setOpenGroupMenu(openGroupMenu === group.id ? null : group.id)}
                        aria-label={messages.common.actions}
                      >
                        <MoreHorizontal size={17} />
                      </button>
                      {openGroupMenu === group.id ? (
                        <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-md border border-bone/15 bg-night p-2 shadow-2xl shadow-black/45">
                          <MenuButton disabled={groups[0]?.id === group.id} onClick={() => moveGroup(group.id, -1)}>
                            {messages.activities.exploration.moveGroupUp}
                          </MenuButton>
                          <MenuButton disabled={groups[groups.length - 1]?.id === group.id} onClick={() => moveGroup(group.id, 1)}>
                            {messages.activities.exploration.moveGroupDown}
                          </MenuButton>
                          <MenuButton danger onClick={() => removeGroup(group.id)}>
                            {messages.activities.exploration.deleteGroup}
                          </MenuButton>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {!isCollapsed ? (
                    <div className="space-y-3">
                      {options.map((option) => (
                        <OptionRow
                          key={option.index}
                          activity={activity}
                          optionIndex={option.index}
                          value={option.label}
                          currentGroupId={option.groupId}
                          groups={groups}
                          open={openOptionMenu === option.index}
                          onOpen={() => setOpenOptionMenu(openOptionMenu === option.index ? null : option.index)}
                          onMoveUp={() => moveOption(option.index, -1)}
                          onMoveDown={() => moveOption(option.index, 1)}
                          onChange={(value) => updateOption(option.index, value)}
                          onAssignGroup={(groupId) => assignOptionToGroup(option.index, groupId)}
                          onDelete={() => removeOption(option.index)}
                        />
                      ))}
                      <Button type="button" variant="secondary" className="min-h-10 px-3" onClick={() => addOption(group?.id)}>
                        <Plus size={16} /> {group ? messages.activities.exploration.addOptionToGroup : messages.activities.exploration.addOption}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {!activity.options.length && !groups.length ? (
              <Button type="button" variant="secondary" onClick={() => addOption()}>
                <Plus size={16} /> {messages.activities.exploration.addOption}
              </Button>
            ) : null}
          </div>

          <label className="block rounded-md border border-bone/10 bg-night/40 p-4">
            <span className="flex items-start gap-3 text-sm font-medium text-bone">
              <input
                type="checkbox"
                className="mt-1"
                checked={Boolean(activity.allowOther)}
                onChange={(event) => onChange({ ...activity, allowOther: event.target.checked })}
              />
              <span>
                <span className="block">{messages.otherOption.allowLabel}</span>
                <span className="mt-1 block text-sm font-normal leading-5 text-bone/52">{messages.otherOption.allowHelper}</span>
              </span>
            </span>
          </label>
        </SubtlePanel>
      ) : null}
    </div>
  );
}

function OptionRow({
  activity,
  optionIndex,
  value,
  currentGroupId,
  groups,
  open,
  onOpen,
  onMoveUp,
  onMoveDown,
  onChange,
  onAssignGroup,
  onDelete
}: {
  activity: ExplorationActivity;
  optionIndex: number;
  value: string;
  currentGroupId?: string;
  groups: ReturnType<typeof orderedOptionGroups>;
  open: boolean;
  onOpen: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChange: (value: string) => void;
  onAssignGroup: (groupId?: string) => void;
  onDelete: () => void;
}) {
  const { messages } = useLocale();
  const siblingIndexes = activity.options
    .map((_, index) => index)
    .filter((index) => (optionGroupIdFor(activity, index) ?? "") === (currentGroupId ?? ""));
  const isFirst = siblingIndexes[0] === optionIndex;
  const isLast = siblingIndexes[siblingIndexes.length - 1] === optionIndex;

  return (
    <div className="relative grid grid-cols-[2.5rem_1fr_2.5rem] items-stretch gap-2">
      <div className="flex flex-col overflow-hidden rounded-md border border-bone/10 bg-night/45">
        <button
          type="button"
          className="flex flex-1 items-center justify-center text-bone/48 transition hover:bg-bone/8 hover:text-bone disabled:opacity-25"
          disabled={isFirst}
          onClick={onMoveUp}
          aria-label={messages.activities.exploration.moveOptionUp}
        >
          <ArrowUp size={15} />
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center border-t border-bone/10 text-bone/48 transition hover:bg-bone/8 hover:text-bone disabled:opacity-25"
          disabled={isLast}
          onClick={onMoveDown}
          aria-label={messages.activities.exploration.moveOptionDown}
        >
          <ArrowDown size={15} />
        </button>
      </div>
      <input className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} />
      <button
        type="button"
        className="rounded-md border border-bone/10 bg-night/45 text-bone/55 transition hover:border-mint/45 hover:text-bone"
        onClick={onOpen}
        aria-label={messages.common.actions}
      >
        <MoreHorizontal size={17} className="mx-auto" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-md border border-bone/15 bg-night p-2 shadow-2xl shadow-black/45">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-bone/40">{messages.activities.exploration.moveToGroup}</p>
          {groups.map((group) => (
            <MenuButton key={group.id} disabled={group.id === currentGroupId} onClick={() => onAssignGroup(group.id)}>
              {group.label || messages.activities.exploration.groupName}
            </MenuButton>
          ))}
          <MenuButton disabled={!currentGroupId} onClick={() => onAssignGroup(undefined)}>
            {messages.activities.exploration.noGroup}
          </MenuButton>
          <MenuButton danger onClick={onDelete}>
            <Trash2 size={14} /> {messages.activities.exploration.deleteOption}
          </MenuButton>
        </div>
      ) : null}
    </div>
  );
}

function MenuButton({
  children,
  danger = false,
  disabled = false,
  onClick
}: {
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-35",
        danger ? "text-orange hover:bg-orange/10" : "text-bone hover:bg-bone/8"
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function cleanAssignments(assignments: Record<string, string>, optionCount: number) {
  return Object.fromEntries(
    Object.entries(assignments).filter(([key, groupId]) => {
      const index = Number(key);
      return Number.isInteger(index) && index >= 0 && index < optionCount && Boolean(groupId);
    })
  );
}
