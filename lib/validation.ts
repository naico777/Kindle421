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
