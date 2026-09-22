import { createFileRoute } from "@tanstack/react-router";
import { Lock, Mail, TriangleAlert, User } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/app/ui";
import { Field, TextInput } from "@/components/app/form";

const title = "Entrar — INNOMNIA Dental";
const description = "Acceso al sistema de gestion de la clinica.";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

type Modo = "entrar" | "crear";

function LoginPage() {
  const { signIn, signUp } = useAuth();

  const [modo, setModo] = useState<Modo>("entrar");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setEnviando(true);

    const fallo =
      modo === "entrar"
        ? await signIn(correo, clave)
        : await signUp(correo, clave, nombre);

    setEnviando(false);

    if (fallo) {
      setError(fallo);
      return;
    }

    if (modo === "crear") {
      setAviso(
        "Cuenta creada. Si te pide confirmar el correo, revisa tu bandeja antes de entrar.",
      );
      setModo("entrar");
      setClave("");
    }
    // Si entro bien, __root.tsx se encarga de llevarla al inicio.
  }

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo);
    setError(null);
    setAviso(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[420px]">
        {/* Marca */}
        <div className="mb-8 text-center">
          <span className="block text-[28px] font-extrabold tracking-[0.02em] text-primary-soft-foreground">
            INNOMNIA
          </span>
          <span className="mt-1 block text-[11px] font-semibold tracking-[0.42em] text-primary">
            DENTAL
          </span>
        </div>

        <div className="surface p-6 sm:p-8">
          <h1 className="text-[22px] font-semibold tracking-tight">
            {modo === "entrar" ? "Entrar" : "Crear cuenta"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {modo === "entrar"
              ? "Accede al sistema de tu clinica."
              : "La primera cuenta que se crea queda como odontologa."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {modo === "crear" && (
              <Field label="Nombre completo">
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
                  <TextInput
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Dra. Maria Reyes"
                    autoComplete="name"
                    required
                    className="pl-11"
                  />
                </div>
              </Field>
            )}

            <Field label="Correo">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
                <TextInput
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="correo@clinica.do"
                  autoComplete="email"
                  required
                  className="pl-11"
                />
              </div>
            </Field>

            <Field
              label="Contrasena"
              hint={modo === "crear" ? "Minimo 6 caracteres." : undefined}
            >
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
                <TextInput
                  type="password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                  minLength={6}
                  required
                  className="pl-11"
                />
              </div>
            </Field>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger"
              >
                <TriangleAlert className="mt-px size-4 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            {aviso && (
              <p className="rounded-xl bg-success-soft px-3.5 py-3 text-sm text-success">
                {aviso}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={enviando}>
              {enviando
                ? "Un momento..."
                : modo === "entrar"
                  ? "Entrar"
                  : "Crear cuenta"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {modo === "entrar" ? (
              <>
                Primera vez?{" "}
                <button
                  type="button"
                  onClick={() => cambiarModo("crear")}
                  className="font-semibold text-primary hover:underline"
                >
                  Crear cuenta
                </button>
              </>
            ) : (
              <>
                Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => cambiarModo("entrar")}
                  className="font-semibold text-primary hover:underline"
                >
                  Entrar
                </button>
              </>
            )}
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Los datos de pacientes son confidenciales. No compartas tu contrasena.
        </p>
      </div>
    </div>
  );
}
