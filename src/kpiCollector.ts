import { AgentBrowser } from "./browser";

export interface KpiDefinition {
  name: string;
  selector: string;
  unit?: string;
  parser?: "text" | "number";
}

export interface KpiRecord {
  name: string;
  selector: string;
  unit?: string;
  rawValue: string | null;
  numericValue?: number;
  collectedAt: string;
  status: "collected" | "missing" | "parse_error";
}

export class KpiCollector {
  constructor(private readonly browser: AgentBrowser) {}

  async collect(definitions: KpiDefinition[]): Promise<KpiRecord[]> {
    const records: KpiRecord[] = [];

    for (const definition of definitions) {
      records.push(await this.collectOne(definition));
    }

    return records;
  }

  private async collectOne(definition: KpiDefinition): Promise<KpiRecord> {
    const rawValue = await this.browser.textContent(
      definition.selector,
      `Collect read-only KPI: ${definition.name}`,
    );
    const trimmedValue = rawValue?.trim() || null;
    const baseRecord = {
      name: definition.name,
      selector: definition.selector,
      unit: definition.unit,
      rawValue: trimmedValue,
      collectedAt: new Date().toISOString(),
    };

    if (!trimmedValue) {
      return {
        ...baseRecord,
        status: "missing",
      };
    }

    if (definition.parser === "number") {
      const numericValue = Number(trimmedValue.replace(/,/g, ""));
      if (Number.isNaN(numericValue)) {
        return {
          ...baseRecord,
          status: "parse_error",
        };
      }

      return {
        ...baseRecord,
        numericValue,
        status: "collected",
      };
    }

    return {
      ...baseRecord,
      status: "collected",
    };
  }
}
