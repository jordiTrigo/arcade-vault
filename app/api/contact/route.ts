import { Resend } from "resend";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ContactPayload = {
  name: string;
  email: string;
  msg: string;
};

export async function POST(request: Request) {
  const body: Partial<ContactPayload> = await request.json();
  const { name, email, msg } = body;

  if (!name?.trim() || !email?.trim() || !msg?.trim()) {
    return Response.json(
      { ok: false, error: "Todos los campos son obligatorios." },
      { status: 400 }
    );
  }

  if (!EMAIL_REGEX.test(email)) {
    return Response.json(
      { ok: false, error: "El formato del correo electrónico no es válido." },
      { status: 400 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: "Arcade Vault <onboarding@resend.dev>",
    to: "jtrigo@gmail.com",
    replyTo: email,
    subject: "Nuevo mensaje de contacto — Arcade Vault",
    text: `Nombre: ${name}\nEmail: ${email}\n\n${msg}`,
  });

  if (error) {
    return Response.json(
      { ok: false, error: "No se pudo enviar el mensaje. Intentá de nuevo." },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
