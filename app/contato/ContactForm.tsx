"use client";

import { type FormEvent, useRef, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";

type FormStatus =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "success"; reference: number }
  | { state: "error"; message: string };

export default function ContactForm() {
  const [status, setStatus] = useState<FormStatus>({ state: "idle" });
  const startedAt = useRef(Date.now());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);

    setStatus({ state: "sending" });
    try {
      const response = await fetch("/__contact", {
        method: "POST",
        credentials: "omit",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          email: values.get("email"),
          category: values.get("category"),
          subject: values.get("subject"),
          message: values.get("message"),
          consent: values.get("consent") === "on",
          website: values.get("website"),
          startedAt: startedAt.current,
        }),
      });

      const result = await response.json().catch(() => null) as {
        reference?: number;
        message?: string;
      } | null;

      if (!response.ok || typeof result?.reference !== "number") {
        throw new Error(
          result?.message
          ?? (response.status === 429
            ? "Recebemos muitas mensagens agora. Aguarde alguns minutos e tente novamente."
            : "Não foi possível enviar sua mensagem. Tente novamente."),
        );
      }

      form.reset();
      startedAt.current = Date.now();
      setStatus({ state: "success", reference: result.reference });
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Não foi possível enviar sua mensagem.",
      });
    }
  }

  return (
    <form className="contactForm" onSubmit={handleSubmit}>
      <div className="contactFormGrid">
        <label>
          <span>Nome</span>
          <input name="name" type="text" autoComplete="name" minLength={2} maxLength={100} required />
        </label>
        <label>
          <span>E-mail</span>
          <input name="email" type="email" autoComplete="email" maxLength={254} required />
        </label>
      </div>

      <label>
        <span>Assunto da solicitação</span>
        <select name="category" defaultValue="" required>
          <option value="" disabled>Selecione uma opção</option>
          <option value="support">Suporte técnico</option>
          <option value="privacy">Privacidade e dados</option>
          <option value="security">Segurança</option>
          <option value="partnership">Parcerias e publicidade</option>
          <option value="suggestion">Sugestão</option>
          <option value="other">Outro assunto</option>
        </select>
      </label>

      <label>
        <span>Título</span>
        <input name="subject" type="text" minLength={5} maxLength={120} required />
      </label>

      <label>
        <span>Mensagem</span>
        <textarea
          name="message"
          minLength={20}
          maxLength={3000}
          rows={7}
          aria-describedby="contactMessageHint"
          required
        />
        <small id="contactMessageHint">Não inclua mensagens, nomes, telefones, arquivos ou anexos da conversa.</small>
      </label>

      <label className="contactTrap" aria-hidden="true">
        <span>Site</span>
        <input name="website" type="text" tabIndex={-1} autoComplete="off" />
      </label>

      <label className="contactConsent">
        <input name="consent" type="checkbox" required />
        <span>Autorizo o armazenamento destes dados para que minha solicitação seja analisada, conforme a <a href="/privacidade">Política de Privacidade</a>.</span>
      </label>

      <div className="contactFormFooter">
        <button className="contactSubmit" type="submit" disabled={status.state === "sending"}>
          <Send aria-hidden="true" />
          {status.state === "sending" ? "Enviando…" : "Enviar solicitação"}
        </button>
        <p className={`contactFormStatus${status.state === "error" ? " error" : ""}`} aria-live="polite" role={status.state === "error" ? "alert" : "status"}>
          {status.state === "success" && (
            <>
              <CheckCircle2 aria-hidden="true" />
              Solicitação enviada. Protocolo #{status.reference}.
            </>
          )}
          {status.state === "error" && status.message}
        </p>
      </div>
    </form>
  );
}
