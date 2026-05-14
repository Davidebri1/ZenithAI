import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/constants/apiAuth";
import { BASE_URL } from "@/constants/aiConfig";

export interface QuotaState {
  promptsUsed: number;
  promptsLimit: number;
  plan: string;
  remaining: number;
  loading: boolean;
  error: string | null;
}

export function useQuota() {
  const [quota, setQuota] = useState<QuotaState>({
    promptsUsed: 0,
    promptsLimit: 10,
    plan: "free",
    remaining: 10,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await authFetch(`${BASE_URL}/api/stripe/quota`);
      if (!res.ok) throw new Error("Failed to fetch quota");
      const data = await res.json();
      setQuota({ ...data, loading: false, error: null });
    } catch (e: any) {
      setQuota((prev) => ({ ...prev, loading: false, error: e.message }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { quota, refresh };
}
