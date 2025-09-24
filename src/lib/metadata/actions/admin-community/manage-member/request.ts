import { z } from "zod";

import type { MetadataActionResult } from "../../types";

const requestSchema = z.object({
  memberId: z.string().optional().nullable(),
  mode: z.enum(["create", "edit"]).optional().nullable(),
  values: z
    .record(z.string(), z.unknown())
    .optional()
    .default({}),
});

export type ManageMemberRequest = z.infer<typeof requestSchema>;

export type ManageMemberRequestParseResult =
  | { success: true; data: ManageMemberRequest }
  | { success: false; error: MetadataActionResult };

export class ManageMemberRequestParser {
  parse(input: unknown): ManageMemberRequestParseResult {
    const parsed = requestSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          success: false,
          status: 400,
          message: "The submitted member data was invalid.",
        },
      } satisfies ManageMemberRequestParseResult;
    }

    return { success: true, data: parsed.data } satisfies ManageMemberRequestParseResult;
  }
}
