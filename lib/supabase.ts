import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { localOnly } from "@/config/runtime";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let client: SupabaseClient | null = null;
// The separate account shop is opt-in; the room retains its local-only mode.
export function getSupabase() {
  if (!url || !key) return null;
  return client ??= createClient(url, key);
}
export const supabase = localOnly ? null : getSupabase();
export async function rpc<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  if (!supabase) throw Error("Облачное подключение не настроено");
  const { data, error } = await supabase.rpc(name, args);
  if (error?.code === 'PT401') {
    // The database detected a revoked Auth session; also clear the browser session.
    await supabase.auth.signOut({ scope: 'local' });
    throw Error('AUTH_SESSION_EXPIRED');
  }
  if (error) throw Error(error.message);
  return data as T;
}
export const errorMessage = (message: string) =>
  ({
    AUTH_SESSION_EXPIRED: "Сеанс входа завершён. Войди в аккаунт снова.",
    INSUFFICIENT_FUNDS:
      "Пока не хватает монет. Каждая активная минута приносит одну.",
    ROOM_VERSION_CONFLICT:
      "Комната изменена в другом окне. Обновили её — повторите действие.",
    ACTIVE_ELSEWHERE: "Таймер работает в другом окне",
    SESSION_EXPIRED:
      "Сеанс завершён. Взаимодействуйте с комнатой, чтобы продолжить.",
    COLLISION: "Здесь уже стоит другой предмет",
    INVALID_SUPPORT: "Выберите столик, комод или стеллаж в комнате",
    INVALID_LEVEL: "Выберите допустимый ярус",
    TOO_TALL: "Вещь слишком высокая для этого яруса. Выберите верх стеллажа",
    OUT_OF_BOUNDS: "Предмет выходит за границы комнаты",
  })[message] ?? message;
