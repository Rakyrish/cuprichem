"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, ensureCsrf } from "@/lib/api";
import type { User } from "@/types";

/**
 * Session state.
 *
 * The token itself lives in an HTTP-only cookie the browser manages, so this
 * only tracks WHO is signed in. `capabilities` mirrors the server's decision —
 * it is used to hide controls the user cannot use, but Django re-checks every
 * request, so hiding is a courtesy and never the actual protection.
 */

interface SessionValue {
  user: User | null;
  loading: boolean;
  can: (capability: string) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      setUser(await api.get<User>("/auth/me/"));
    } catch (error) {
      // A 401 here is the normal "not signed in" case, not a failure.
      if (!(error instanceof ApiError) || error.status !== 401) {
        console.error("Failed to load session", error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void ensureCsrf().then(load);
  }, [load]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await ensureCsrf();
      const result = await api.post<{ user: User }>("/auth/login/", {
        email,
        password,
      });
      setUser(result.user);
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      await api.post("/auth/logout/");
    } finally {
      setUser(null);
      router.replace("/login");
    }
  }, [router]);

  const can = useCallback(
    (capability: string) => Boolean(user?.capabilities.includes(capability)),
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, can, signIn, signOut, refresh: load }),
    [user, loading, can, signIn, signOut, load],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used inside a SessionProvider.");
  }
  return context;
}

/** Capability constants — mirrors apps/accounts/models.py. */
export const CAP = {
  PRODUCT_VIEW: "product.view",
  PRODUCT_EDIT: "product.edit",
  PRODUCT_DELETE: "product.delete",
  PRODUCT_PUBLISH: "product.publish",
  TAXONOMY_EDIT: "taxonomy.edit",
  ARTICLE_EDIT: "article.edit",
  SEO_VIEW: "seo.view",
  SEO_EDIT: "seo.edit",
  SEO_AUDIT: "seo.audit",
  AI_GENERATE: "ai.generate",
  MEDIA_VIEW: "media.view",
  MEDIA_EDIT: "media.edit",
  INQUIRY_VIEW: "inquiry.view",
  INQUIRY_EDIT: "inquiry.edit",
  AUDIT_VIEW: "audit.view",
  USER_MANAGE: "user.manage",
  SETTINGS_MANAGE: "settings.manage",
} as const;
