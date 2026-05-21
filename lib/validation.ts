import { z } from "zod";

export const subscriptionSchema = z.object({
  kindleEmail: z
    .string()
    .email("Ingresá una dirección Kindle válida.")
    .refine((email) => email.toLowerCase().endsWith("@kindle.com"), {
      message: "La dirección debe terminar en @kindle.com.",
    }),
  acceptedChecklist: z.coerce.boolean().refine(Boolean, {
    message: "Tenés que confirmar la checklist para activar el envío.",
  }),
  captchaToken: z.string().optional(),
});

export const magazineIssueSchema = z.object({
  issueNumber: z.coerce.number().int().positive(),
  title: z.string().trim().min(3),
  publicationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sourceFilename: z.string().trim().optional(),
  sourceText: z.string().trim().min(200, "Pegá el texto adaptado del número antes de guardarlo."),
});

export const magazineTestSchema = z.object({
  issueId: z.string().uuid(),
  kindleEmail: z
    .string()
    .email()
    .refine((email) => email.toLowerCase().endsWith("@kindle.com")),
});

export const magazineSendSchema = z.object({
  issueId: z.string().uuid(),
});
