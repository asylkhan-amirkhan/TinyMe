# TinyMe / MyRoom

Ветка `ideas` содержит приложение из `myroom-main.zip` в корневой структуре TinyMe.

- `/` — главная страница MyRoom.
- `/intro` — сохранённое анимированное интро TinyMe.
- `/room` — комната MyRoom, в том числе переход из интро.

## Запуск

```sh
npm ci
npm run dev
```

Открой http://127.0.0.1:3000. Проверки: `npm run typecheck`, `npm test`, `npm run build`.

Облачные функции требуют Supabase: скопируй `.env.example` в `.env.local`, укажи публичные настройки и следуй [инструкции](docs/SETUP.md). Без настройки Supabase облачный вход и сохранение недоступны; комната `/room` поддерживает локальный режим.

Исходники лежат в `app/`, `components/`, `domain/`, `engine/` и `lib/`, без промежуточного `src/`. Пути тестов и вспомогательных скриптов приведены к этой структуре.

[Описание MyRoom](docs/myroom/README.md) · [ТЗ TinyMe](docs/tz/TZ.md)
