# Discourse для Obsidian

[English documentation](README.en.md)

Тёмная тема для Obsidian, собранная по визуальному языку Discourse: палитра,
иконки, боковая панель, типографика и правый блок-таймлайн. Плюс небольшой
плагин с liquid-glass вкладками и настройкой цветов категорий.

![Превью темы](preview.png)

![Настройки цветов](settings.png)

## Возможности

- **Тёмная палитра**: фон `#0b0b0d`, текст `#dadadb`, акцент `#4e7dff`.
- **Сайдбар как форум**: заголовок `CATEGORIES`, цветные квадраты разделов,
  точки подпапок, документ-иконки заметок.
- **Liquid-glass вкладки**: активная вкладка — плавающая стеклянная пилюля,
  которая плавно перетекает между вкладками.
- **Правый блок-таймлайн**: показывает главный блок, подблок, счётчики
  `N / M` и процент прокрутки. Полоса кликабельна по всей высоте; колесо мыши
  над ней прокручивает заметку.
- **Все заметки и сплиты**: таймлайн ставится в каждую видимую markdown-панель.
- **Полная ширина**: тема уважает настройку Obsidian
  `Readable line length`. Если она выключена, текст не запирается в
  центрированный прямоугольник.
- **Цвета категорий**: 7 пресетов + color picker для каждой верхнеуровневой
  папки текущего хранилища.
- **Kanban Plus**: доски, колонки и карточки сохраняют компактные размеры
  плагина и не растягиваются темой.
- **Мелочи**: выровненные кнопки шапки, исправленный поиск `Ctrl+F`,
  центрированные toggle-чекбоксы, Inter + JetBrains Mono, стилизованные
  таблицы, callout, `<details>`, код и цитаты.

## Установка

### Windows — одной командой

Открой PowerShell **в корне vault** (папка, где лежит `.obsidian`) и выполни:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr https://raw.githubusercontent.com/ZekiTRR/Discourse-obsidian/main/install.ps1 -UseBasicParsing | iex"
```

Или явно укажи путь к vault:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -VaultPath "C:\Users\You\Documents\MyVault"
```

Скрипт скачает последний релиз, положит тему в
`.obsidian/themes/Discourse`, плагин в
`.obsidian/plugins/discourse-theme-settings`, включит плагин в
`community-plugins.json` и выставит тему в `appearance.json`.

### macOS / Linux

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/ZekiTRR/Discourse-obsidian/main/install.sh) "/path/to/your/vault"
```

Нужны `curl` и `unzip`; для автоматического включения плагина — `python3`.

### Вручную

1. Открой [Releases](https://github.com/ZekiTRR/Discourse-obsidian/releases).
2. Скачай:
   - `Discourse.zip`
   - `discourse-theme-settings.zip`
3. Распакуй:
   - `Discourse/` → `<vault>/.obsidian/themes/Discourse/`
   - `discourse-theme-settings/` → `<vault>/.obsidian/plugins/discourse-theme-settings/`
4. `Settings → Appearance → Themes → Discourse`.
5. `Settings → Community plugins` → включи **Discourse Theme Settings**.
6. Перезапусти Obsidian.

> В релизе также есть `Discourse-obsidian.zip`: внутри папки `themes/` и
> `plugins/`, которые можно распаковать прямо в `.obsidian/`.

## Настройка

Открой:

`Settings → Discourse Theme Settings`

или найди в command palette:

`Discourse: Открыть настройки Discourse`

Там:

- **Пресет** — `Discourse Dark / Discord / GitHub / Cyberpunk / Pastel / Nord / Monochrome`.
  Палитра распределяется по верхнеуровневым папкам текущего хранилища.
- **Цвет каждой папки** — color picker; список строится по папкам хранилища.
- **Сбросить цвета** — вернуть палитру по умолчанию.
- **Liquid glass вкладки** — включить/выключить.
- **Таймлайн блоков** — включить/выключить.
- **Место под таймлайн** — резервировать полосу справа или позволить
  таймлайну плавать поверх текста.

## Палитра по умолчанию

| Папка              | Цвет      |
| ------------------ | --------- |
| `00 - Hub`         | `#0088cc` |
| `01 - Subjects`    | `#bf1e2e` |
| `02 - Projects`    | `#e45735` |
| `03 - Bacalaureat` | `#92278f` |
| `99 - Archive`     | `#25aae2` |
| `_Attachments`     | `#9eb83b` |
| `_Templates`       | `#fbbf24` |

Папки с этими именами сохраняют закреплённые цвета в любом хранилище. Остальные
верхнеуровневые папки получают цвета палитры по алфавиту. Плагин читает
фактические папки текущего хранилища, поэтому список в настройках всегда
соответствует открытому vault. Без плагина работает резервный цикл по порядку
папок.

## Структура репозитория

```
.
├── manifest.json                  # тема (корень репозитория — валидная тема)
├── theme.css
├── preview.png
├── settings.png
├── preview.html                   # интерактивный макет
├── fonts/
│   ├── inter-var.woff2
│   └── JetBrainsMono-Regular.woff2
├── plugin/
│   └── discourse-theme-settings/
│       ├── manifest.json
│       └── main.js
├── install.ps1
├── install.sh
├── README.md                      # русская документация
├── README.en.md                   # английская документация
└── .github/workflows/release.yml
```

Корень можно склонировать прямо в `.obsidian/themes/Discourse`, но проще
использовать релизные архивы.

## Требования и совместимость

- Obsidian **1.5+**, проверено на **1.15.1** (Windows).
- Desktop и mobile; на узких панелях таймлайн автоматически уступает место
  нативному скроллбару.
- Тема **тёмная по дизайну**: в светлом режиме Obsidian она остаётся тёмной.
- Если сторонний сниппет или плагин переопределяет цвета, отключи его в
  `Settings → Appearance → CSS snippets`.
- Плагин необходим для пресетов цветов, liquid-glass вкладок и таймлайна.
  Без него тема работает, но эти функции отключены.

## Что перенесено

| Discourse UI                                  | Obsidian                       |
| --------------------------------------------- | ------------------------------ |
| Пилл-навигация `Main / Forum / Market / Help` | Пилл-полоса вкладок            |
| `CATEGORIES` с цветными квадратами            | Папки с цветными маркерами     |
| Подкатегории                                  | Точки подпапок в цвете раздела |
| Тема форума                                   | Заголовок заметки              |
| Пост, цитата, details, таблицы                | Markdown-стили                 |
| Правый таймлайн темы                          | Блок-таймлайн с подписями      |
| Тёмные стеклянные панели                      | Glass-панели, ring, blur       |

## Лицензии

- Код темы и плагина: [MIT](LICENSE).
- Шрифты **Inter Variable** и **JetBrains Mono**: SIL Open Font License 1.1.
  Полный текст — в [OFL.txt](OFL.txt), детали — в [FONTS.md](FONTS.md).

## Дисклеймер

Проект вдохновлён интерфейсом Discourse и не является официальным продуктом
Discourse. Все названия и цветовые схемы использованы как визуальный референс.
