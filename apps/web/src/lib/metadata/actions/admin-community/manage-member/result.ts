import type { MetadataActionConfig, MetadataActionResult } from "../../types";

import type { ManageMemberRequest } from "./request";

const DEFAULT_CREATE_MESSAGE = "New member record drafted.";
const DEFAULT_UPDATE_MESSAGE = "Member record updated.";

export class ManageMemberResultBuilder {
  build(
    config: MetadataActionConfig,
    mode: ManageMemberRequest["mode"],
    memberId: string | null,
  ): Pick<MetadataActionResult, "message" | "redirectUrl"> {
    const createMessage =
      typeof config.createMessage === "string" ? config.createMessage : DEFAULT_CREATE_MESSAGE;
    const updateMessage =
      typeof config.updateMessage === "string" ? config.updateMessage : DEFAULT_UPDATE_MESSAGE;
    const message =
      typeof config.successMessage === "string"
        ? config.successMessage
        : mode === "edit"
        ? updateMessage
        : createMessage;

    const redirectUrl = this.resolveRedirectUrl(config, memberId);

    return {
      message,
      redirectUrl,
    };
  }

  private resolveRedirectUrl(config: MetadataActionConfig, memberId: string | null): string | null {
    if (typeof config.redirectUrl === "string") {
      return config.redirectUrl;
    }

    if (typeof config.redirectTemplate === "string" && memberId) {
      return this.applyTemplate(config.redirectTemplate, { memberId });
    }

    if (typeof config.url === "string") {
      return config.url;
    }

    return memberId ? `/admin/members/${memberId}` : null;
  }

  private applyTemplate(template: string, context: Record<string, unknown>): string {
    return template.replace(/{{\s*(.*?)\s*}}/g, (_, rawKey: string) => {
      const key = rawKey.trim();
      const value = context[key];
      return value === undefined || value === null ? "" : String(value);
    });
  }
}
