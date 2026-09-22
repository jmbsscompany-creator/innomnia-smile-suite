// Maneja quien esta conectado y que puede hacer.
// Envuelve toda la app desde __root.tsx.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/database.types";

interface AuthValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** true si el usuario conectado es la dentista (no la secretaria) */
  isDentista: boolean;
  /** Devuelve null si todo salio bien, o el mensaje de error en espanol. */
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, fullName: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Traduce los errores de Supabase, que vienen en ingles y suenan a maquina. */
function traducirError(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contrasena incorrectos.";
  if (m.includes("email not confirmed"))
    return "Primero tienes que confirmar tu correo. Revisa tu bandeja de entrada.";
  if (m.includes("user already registered"))
    return "Ese correo ya tiene cuenta. Entra en vez de crear una nueva.";
  if (m.includes("password should be at least"))
    return "La contrasena debe tener al menos 6 caracteres.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled"))
    return "El registro esta cerrado. Pidele a la dentista que te cree la cuenta.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "No se pudo conectar con el servidor. Revisa tu internet.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiados intentos. Espera un minuto y vuelve a probar.";
  return mensaje;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Lee la sesion guardada al abrir, y se queda escuchando cambios
  // (entrar, salir, o que el token se renueve solo).
  useEffect(() => {
    let vivo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nueva) => {
      setSession(nueva);
      setLoading(false);
    });

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Cuando hay sesion, busca el perfil (nombre y rol).
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setProfile(null);
      return;
    }
    let vivo = true;
    void supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (vivo) setProfile((data as Profile | null) ?? null);
      });
    return () => {
      vivo = false;
    };
  }, [session?.user?.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return error ? traducirError(error.message) : null;
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    return error ? traducirError(error.message) : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      profile,
      loading,
      isDentista: profile?.role === "dentista",
      signIn,
      signUp,
      signOut,
    }),
    [session, profile, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
