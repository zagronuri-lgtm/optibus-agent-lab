import { readFile } from "node:fs/promises";

const PLACEHOLDER_MARKERS = [
  "uploaded `optibus_mastery.md` file was not present",
  "Replace or extend `knowledge/optibus_mastery.md`",
  "required run-readiness and failure-diagnosis rules from the task",
];

export interface KnowledgeBase {
  path: string;
  content: string;
  loaded: boolean;
  isPlaceholder: boolean;
}

export async function loadKnowledgeBase(path = "knowledge/optibus_mastery.md"): Promise<KnowledgeBase> {
  try {
    const content = await readFile(path, "utf8");
    return {
      path,
      content,
      loaded: true,
      isPlaceholder: isPlaceholderKnowledgeBase(content),
    };
  } catch (error) {
    return {
      path,
      content: "",
      loaded: false,
      isPlaceholder: false,
    };
  }
}

export function isRealKnowledgeBase(knowledgeBase: KnowledgeBase): boolean {
  return knowledgeBase.loaded && !knowledgeBase.isPlaceholder;
}

export function isPlaceholderKnowledgeBase(content: string): boolean {
  return PLACEHOLDER_MARKERS.some((marker) => content.includes(marker));
}
