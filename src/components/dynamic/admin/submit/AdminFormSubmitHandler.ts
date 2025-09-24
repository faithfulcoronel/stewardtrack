import type { UseFormReturn } from "react-hook-form";

import type { ActionConfig } from "../../shared";
import type { MetadataActionResult } from "@/lib/metadata/actions";
import type { MetadataActionErrorBag } from "@/lib/metadata/actions/types";

import type { AdminFormMode } from "../types";

export interface NavigationService {
  push(url: string): void;
}

export interface NotificationService {
  success(message: string): void;
  error(message: string): void;
}

export interface MetadataExecutionOptions {
  input?: unknown;
  context?: {
    params?: Record<string, string | string[] | undefined>;
    role?: string | null;
  };
}

export type MetadataActionExecutor = (
  action: ActionConfig | null | undefined,
  options?: MetadataExecutionOptions,
) => Promise<MetadataActionResult>;

interface SubmitActionSettings {
  identifierKey: string | null;
  identifierCandidates: string[];
  createMessage: string | null;
  updateMessage: string | null;
  successMessage: string | null;
  errorMessage: string | null;
  redirectTemplate: string | null;
}

interface SubmitSuccessContext {
  identifier: string | null;
  message: string | null;
  redirectUrl: string | null;
  payload: Record<string, unknown>;
  resultData: Record<string, unknown> | null;
  defaultMessage: string | null;
}

interface AdminFormSubmitHandlerOptions {
  form: UseFormReturn<Record<string, unknown>>;
  action: ActionConfig | null | undefined;
  mode: AdminFormMode | null;
  metadataExecutor: MetadataActionExecutor;
  notifier: NotificationService;
  navigator: NavigationService;
  contextParams: Record<string, string | string[]>;
  role: string | null;
  onFormErrors?: (errors: string[]) => void;
}

export class AdminFormSubmitHandler {
  private readonly form: UseFormReturn<Record<string, unknown>>;

  private readonly action: ActionConfig | null | undefined;

  private readonly mode: AdminFormMode | null;

  private readonly metadataExecutor: MetadataActionExecutor;

  private readonly notifier: NotificationService;

  private readonly navigator: NavigationService;

  private readonly contextParams: Record<string, string | string[]>;

  private readonly settings: SubmitActionSettings;

  private readonly contextRole: string | null;

  private readonly handleFormErrors: ((errors: string[]) => void) | null;

  constructor(options: AdminFormSubmitHandlerOptions) {
    this.form = options.form;
    this.action = options.action;
    this.mode = options.mode ?? null;
    this.metadataExecutor = options.metadataExecutor;
    this.notifier = options.notifier;
    this.navigator = options.navigator;
    this.contextParams = options.contextParams;
    this.settings = this.resolveSubmitActionSettings(options.action);
    this.contextRole = options.role ?? null;
    this.handleFormErrors = options.onFormErrors ?? null;
  }

  async handleSubmit(values: Record<string, unknown>): Promise<void> {
    this.clearServerErrors();

    const payload = this.buildActionPayload(values);
    const contextIdentifier = this.resolveIdentifier(this.contextParams);
    const defaultSuccessMessage = this.resolveSuccessMessage();

    if (!this.hasMetadataHandler()) {
      this.notifier.error("This form is missing a submit handler. Please contact the support team.");
      return;
    }

    try {
      const result = await this.metadataExecutor(this.action, {
        input: payload,
        context: {
          params: this.contextParams,
          role: this.contextRole,
        },
      });

      const normalizedResult = this.normalizeResultData(result.data);
      const identifierFromResult = this.resolveIdentifier({
        ...this.contextParams,
        ...(normalizedResult ?? {}),
      });

      this.handleSuccess({
        identifier: identifierFromResult ?? contextIdentifier,
        message: result.message ?? null,
        redirectUrl: result.redirectUrl ?? null,
        payload,
        resultData: normalizedResult,
        defaultMessage: defaultSuccessMessage,
      });
    } catch (error) {
      console.error("Failed to submit admin form", error);
      if (this.tryApplyMetadataErrors(error)) {
        return;
      }

      const message =
        error instanceof Error && error.message
          ? error.message
          : this.settings.errorMessage ?? "Saving changes failed. Please try again in a moment.";
      this.applyFormErrors([message]);
    }
  }

  private handleSuccess(context: SubmitSuccessContext) {
    this.notifyFormErrors([]);

    const toastMessage = context.message ?? context.defaultMessage;
    if (toastMessage) {
      this.notifier.success(toastMessage);
    }

    const templateContext = this.buildTemplateContext({
      payload: context.payload,
      resultData: context.resultData,
      identifier: context.identifier,
      params: this.contextParams,
    });

    const redirectUrl =
      context.redirectUrl ?? this.renderRedirectFromTemplate(this.settings.redirectTemplate, templateContext);

    if (redirectUrl) {
      this.navigator.push(redirectUrl);
    }
  }

  private hasMetadataHandler(): boolean {
    const action = this.action;
    if (!action) {
      return false;
    }
    if (typeof action.kind === "string" && action.kind.length > 0) {
      return true;
    }
    if (action.config && typeof action.config === "object" && action.config !== null) {
      const config = action.config as Record<string, unknown>;
      if (typeof config.handler === "string" && config.handler.length > 0) {
        return true;
      }
    }
    return false;
  }

  private resolveSuccessMessage(): string | null {
    switch (this.mode) {
      case "edit":
        return this.settings.updateMessage ?? this.settings.successMessage ?? "Changes saved successfully.";
      case "create":
        return this.settings.createMessage ?? this.settings.successMessage ?? "Form submitted successfully.";
      default:
        return (
          this.settings.successMessage ??
          this.settings.updateMessage ??
          this.settings.createMessage ??
          "Changes saved successfully."
        );
    }
  }

  private buildActionPayload(values: Record<string, unknown>): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      mode: this.mode ?? null,
      values,
    };

    if (this.settings.identifierKey) {
      payload[this.settings.identifierKey] = this.resolveIdentifier(this.contextParams);
    }

    return payload;
  }

  private resolveIdentifier(source: Record<string, unknown>): string | null {
    for (const candidate of this.settings.identifierCandidates) {
      const value = source[candidate];
      if (value === undefined) {
        continue;
      }
      if (Array.isArray(value)) {
        const first = value.find((item) => typeof item === "string" && item.trim().length > 0);
        if (typeof first === "string") {
          return first;
        }
        continue;
      }
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }
    return null;
  }

  private resolveSubmitActionSettings(action: ActionConfig | null | undefined): SubmitActionSettings {
    const config = (action?.config ?? {}) as Record<string, unknown>;

    const candidates: string[] = [];
    const pushCandidate = (value: unknown) => {
      const str = this.toOptionalString(value);
      if (!str) {
        return;
      }
      if (!candidates.includes(str)) {
        candidates.push(str);
      }
    };

    const createMessage = this.toOptionalString(config.createMessage);
    const updateMessage = this.toOptionalString(config.updateMessage);
    const successMessage = this.toOptionalString(config.successMessage);
    const errorMessage = this.toOptionalString(config.errorMessage);
    const redirectTemplate = this.toOptionalString(
      config.redirectTemplate ?? config.successRedirect ?? config.redirectUrl ?? config.url,
    );

    pushCandidate(config.identifierKey ?? config.idParam ?? config.resourceIdParam ?? config.primaryIdentifier);

    const identifierList = this.toStringArray(
      config.identifierCandidates ?? config.identifierKeys ?? config.resultIdentifierKeys ?? [],
    );
    for (const value of identifierList) {
      pushCandidate(value);
    }

    if (redirectTemplate) {
      const tokens = this.extractTemplateTokens(redirectTemplate);
      for (const token of tokens) {
        pushCandidate(token);
      }
    }

    pushCandidate(config.resultKey ?? config.identifierField ?? config.resultIdentifier);

    if (!candidates.includes("id")) {
      candidates.push("id");
    }
    if (!candidates.includes("recordId")) {
      candidates.push("recordId");
    }

    const identifierKey = candidates.length > 0 ? candidates[0] : null;

    return {
      identifierKey,
      identifierCandidates: candidates,
      createMessage,
      updateMessage,
      successMessage,
      errorMessage,
      redirectTemplate,
    };
  }

  private buildTemplateContext({
    payload,
    resultData,
    identifier,
    params,
  }: {
    payload: Record<string, unknown>;
    resultData: Record<string, unknown> | null;
    identifier: string | null;
    params: Record<string, string | string[]>;
  }): Record<string, unknown> {
    const context: Record<string, unknown> = {
      ...payload,
      data: resultData ?? {},
      params,
    };

    if (resultData) {
      Object.assign(context, resultData);
    }

    if (identifier) {
      context.id = context.id ?? identifier;
      context.identifier = context.identifier ?? identifier;
    }

    return context;
  }

  private renderRedirectFromTemplate(template: string | null, context: Record<string, unknown>): string | null {
    if (!template) {
      return null;
    }

    let missing = false;
    const rendered = template.replace(/{{\s*([^}]+?)\s*}}/g, (_, expression: string) => {
      const value = this.resolvePathValue(context, expression.trim());
      if (value === undefined || value === null) {
        missing = true;
        return "";
      }
      const stringValue = String(value);
      if (!stringValue) {
        missing = true;
      }
      return stringValue;
    });

    if (missing) {
      return null;
    }

    return rendered;
  }

  private normalizeResultData(data: unknown): Record<string, unknown> | null {
    if (!this.isPlainObject(data)) {
      return null;
    }
    return data;
  }

  private extractTemplateTokens(template: string): string[] {
    const matches = template.match(/{{\s*([^}]+?)\s*}}/g);
    if (!matches) {
      return [];
    }

    const tokens: string[] = [];

    for (const match of matches) {
      const tokenMatch = match.match(/{{\s*([^}]+?)\s*}}/);
      if (!tokenMatch) {
        continue;
      }
      const token = tokenMatch[1].trim();
      if (!token) {
        continue;
      }
      tokens.push(token);
      const segments = token.split(".");
      if (segments.length > 1) {
        const last = segments[segments.length - 1];
        if (last) {
          tokens.push(last);
        }
      }
    }

    return tokens;
  }

  private toOptionalString(value: unknown): string | null {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
    return null;
  }

  private toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((item) => this.toOptionalString(item)).filter((item): item is string => Boolean(item));
    }
    const single = this.toOptionalString(value);
    return single ? [single] : [];
  }

  private resolvePathValue(source: Record<string, unknown>, path: string): unknown {
    const segments = path
      .split(".")
      .map((segment) => segment.trim())
      .filter(Boolean);
    let current: unknown = source;
    for (const segment of segments) {
      if (!this.isPlainObject(current)) {
        return undefined;
      }
      current = current[segment];
    }
    return current;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private clearServerErrors(): void {
    this.form.clearErrors();
    this.notifyFormErrors([]);
  }

  private notifyFormErrors(errors: string[]): void {
    this.handleFormErrors?.(errors);
  }

  private tryApplyMetadataErrors(error: unknown): boolean {
    const result = this.extractMetadataResult(error);
    if (!result) {
      return false;
    }

    const errorBag: MetadataActionErrorBag | null | undefined = result.errors;
    const fieldErrors = this.applyFieldErrors(errorBag?.fieldErrors);
    const formErrors = this.applyFormErrors(
      errorBag?.formErrors && errorBag.formErrors.length
        ? errorBag.formErrors
        : result.message
          ? [result.message]
          : [],
    );

    if (!fieldErrors && !formErrors) {
      return false;
    }

    return true;
  }

  private extractMetadataResult(error: unknown): MetadataActionResult | null {
    if (!error || typeof error !== "object") {
      return null;
    }

    const result = (error as { result?: MetadataActionResult | null | undefined }).result;
    if (!result || typeof result !== "object") {
      return null;
    }

    return result;
  }

  private applyFieldErrors(
    errors: MetadataActionErrorBag["fieldErrors"] | null | undefined,
  ): boolean {
    if (!errors) {
      return false;
    }

    let hasApplied = false;
    let shouldFocus = true;
    for (const [field, messages] of Object.entries(errors)) {
      if (!messages?.length) {
        continue;
      }

      hasApplied = true;
      this.form.setError(field as never, { type: "server", message: messages.join(" ") }, { shouldFocus });
      if (shouldFocus) {
        shouldFocus = false;
      }
    }

    return hasApplied;
  }

  private applyFormErrors(messages: string[] | null | undefined): boolean {
    const normalized = messages?.filter((message) => message.trim().length > 0) ?? [];
    if (!normalized.length) {
      return false;
    }

    this.notifyFormErrors(normalized);
    return true;
  }
}
