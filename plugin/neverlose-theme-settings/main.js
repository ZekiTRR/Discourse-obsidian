const { Plugin, PluginSettingTab, Setting, MarkdownView } = require("obsidian");

const CATEGORY_DEFS = [
  { key: "hub", label: "00 - Hub", varName: "--nle-cat-hub" },
  { key: "subjects", label: "01 - Subjects", varName: "--nle-cat-subjects" },
  { key: "projects", label: "02 - Projects", varName: "--nle-cat-projects" },
  { key: "bac", label: "03 - Bacalaureat", varName: "--nle-cat-bac" },
  { key: "archive", label: "99 - Archive", varName: "--nle-cat-archive" },
  {
    key: "attachments",
    label: "_Attachments",
    varName: "--nle-cat-attachments",
  },
  { key: "templates", label: "_Templates", varName: "--nle-cat-templates" },
];

const PRESETS = {
  neverlose: {
    label: "Neverlose (форум)",
    colors: {
      hub: "#0088cc",
      subjects: "#bf1e2e",
      projects: "#e45735",
      bac: "#92278f",
      archive: "#25aae2",
      attachments: "#9eb83b",
      templates: "#fbbf24",
    },
  },
  discord: {
    label: "Discord",
    colors: {
      hub: "#5865f2",
      subjects: "#ed4245",
      projects: "#faa61a",
      bac: "#eb459e",
      archive: "#00b0f4",
      attachments: "#57f287",
      templates: "#fee75c",
    },
  },
  github: {
    label: "GitHub",
    colors: {
      hub: "#58a6ff",
      subjects: "#f85149",
      projects: "#d29922",
      bac: "#bc8cff",
      archive: "#39c5cf",
      attachments: "#3fb950",
      templates: "#e3b341",
    },
  },
  cyber: {
    label: "Cyberpunk",
    colors: {
      hub: "#00e5ff",
      subjects: "#ff2a6d",
      projects: "#ff9f1c",
      bac: "#d300c5",
      archive: "#05d9e8",
      attachments: "#b6ff00",
      templates: "#ffe600",
    },
  },
  pastel: {
    label: "Pastel",
    colors: {
      hub: "#8fb8ff",
      subjects: "#ff9aa2",
      projects: "#ffb570",
      bac: "#c7a0ff",
      archive: "#86d9e8",
      attachments: "#a8e6a1",
      templates: "#ffe08a",
    },
  },
  nord: {
    label: "Nord",
    colors: {
      hub: "#88c0d0",
      subjects: "#bf616a",
      projects: "#d08770",
      bac: "#b48ead",
      archive: "#5e81ac",
      attachments: "#a3be8c",
      templates: "#ebcb8b",
    },
  },
  mono: {
    label: "Monochrome",
    colors: {
      hub: "#d1d5db",
      subjects: "#9ca3af",
      projects: "#6b7280",
      bac: "#4b5563",
      archive: "#a3a3a3",
      attachments: "#737373",
      templates: "#e5e5e5",
    },
  },
};

const DEFAULT_SETTINGS = {
  preset: "neverlose",
  colors: { ...PRESETS.neverlose.colors },
  liquidTabs: true,
  timeline: true,
  timelineGutter: true,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cleanHeading(text) {
  return String(text || "")
    .replace(/[*_`~]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function parseHeadingsFromText(text) {
  const lines = String(text || "").split("\n");
  const headings = [];
  let inCode = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;

    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (match) {
      headings.push({
        level: match[1].length,
        heading: match[2],
        position: { start: { line: i } },
      });
    }
  }

  return headings;
}

class NeverloseSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("Цвета категорий").setHeading();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Пресеты меняют цвета сразу. Любой цвет можно поправить пипеткой — " +
        "после этого режим станет «Свои цвета».",
    });

    new Setting(containerEl)
      .setName("Пресет")
      .setDesc("Готовая палитра для семи разделов.")
      .addDropdown((dropdown) => {
        this.plugin.presetDropdown = dropdown;
        for (const [id, preset] of Object.entries(PRESETS)) {
          dropdown.addOption(id, preset.label);
        }
        dropdown.addOption("custom", "Свои цвета");
        dropdown.setValue(this.plugin.settings.preset);
        dropdown.onChange(async (value) => {
          this.plugin.settings.preset = value;
          if (value !== "custom" && PRESETS[value]) {
            this.plugin.settings.colors = { ...PRESETS[value].colors };
            this.plugin.applyColors();
            await this.plugin.saveSettings();
            this.display();
          } else {
            await this.plugin.saveSettings();
          }
        });
      });

    for (const def of CATEGORY_DEFS) {
      new Setting(containerEl)
        .setName(def.label)
        .setDesc(def.varName)
        .addColorPicker((picker) => {
          picker.setValue(this.plugin.settings.colors[def.key]);
          picker.onChange(async (value) => {
            this.plugin.settings.colors[def.key] = value;
            this.plugin.settings.preset = "custom";
            this.plugin.presetDropdown?.setValue("custom");
            this.plugin.applyColors();
            await this.plugin.saveSettings();
          });
        });
    }

    new Setting(containerEl)
      .setName("Сбросить цвета")
      .setDesc("Вернуть оригинальную палитру Neverlose.")
      .addButton((button) => {
        button
          .setButtonText("Сбросить")
          .setCta()
          .onClick(async () => {
            this.plugin.settings.preset = "neverlose";
            this.plugin.settings.colors = {
              ...PRESETS.neverlose.colors,
            };
            this.plugin.applyColors();
            await this.plugin.saveSettings();
            this.display();
          });
      });

    new Setting(containerEl).setName("Интерфейс").setHeading();

    new Setting(containerEl)
      .setName("Liquid glass вкладки")
      .setDesc("Плавающий стеклянный индикатор активной вкладки.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.liquidTabs)
          .onChange(async (value) => {
            this.plugin.settings.liquidTabs = value;
            await this.plugin.saveSettings();
            this.plugin.refreshLiquid();
          });
      });

    new Setting(containerEl)
      .setName("Таймлайн блоков")
      .setDesc("Показывать главный блок, подблок и счётчики справа.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.timeline)
          .onChange(async (value) => {
            this.plugin.settings.timeline = value;
            await this.plugin.saveSettings();
            this.plugin.mountTimeline();
          });
      });

    new Setting(containerEl)
      .setName("Место под таймлайн")
      .setDesc("Оставлять полосу справа, чтобы таймлайн не перекрывал текст.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.timelineGutter)
          .onChange(async (value) => {
            this.plugin.settings.timelineGutter = value;
            await this.plugin.saveSettings();
            this.plugin.mountTimeline();
          });
      });
  }
}

module.exports = class NeverloseThemeSettings extends Plugin {
  async onload() {
    await this.loadSettings();
    this.applyColors();

    this.addSettingTab(new NeverloseSettingTab(this.app, this));

    this.addCommand({
      id: "open-settings",
      name: "Открыть настройки Neverlose",
      callback: () => {
        this.app.setting.open();
        this.app.setting.openTabById?.(this.manifest.id);
      },
    });

    this.addCommand({
      id: "reset-category-colors",
      name: "Сбросить цвета категорий",
      callback: async () => {
        this.settings.preset = "neverlose";
        this.settings.colors = { ...PRESETS.neverlose.colors };
        this.applyColors();
        await this.saveSettings();
      },
    });

    this.liquidFrame = null;
    this.timelineFrame = null;
    this.liquidObserved = new Set();
    this.liquidState = new Map();
    this.lastLiquidState = null;
    this.liquidSeq = 0;
    this.fileTextCache = new Map();
    this.fileTextLoading = new Set();

    this.setupLiquidTabs();
    this.setupTimeline();

    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.refreshLiquid();
        this.mountTimeline();
      }),
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.scheduleLiquid();
        this.mountTimeline();
      }),
    );

    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        this.mountTimeline();
      }),
    );

    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        this.fileTextCache.delete(file.path);
        const relevant = [...this.timelines.values()].some(
          (entry) => entry.view?.file === file,
        );
        if (relevant) this.scheduleTimeline();
      }),
    );

    this.registerDomEvent(
      document,
      "scroll",
      () => this.scheduleTimeline(),
      true,
    );

    this.registerDomEvent(window, "resize", () => {
      this.scheduleLiquid();
      this.scheduleTimeline();
    });

    this.app.workspace.onLayoutReady(() => {
      this.refreshLiquid();
      this.mountTimeline();
    });

    // Workspace restore can finish before the plugin is loaded; this
    // lightweight guard mounts the timeline as soon as a markdown leaf exists.
    this.registerInterval(
      window.setInterval(() => {
        this.mountTimeline();
        this.scheduleLiquid();
      }, 1200),
    );
  }

  onunload() {
    if (this.liquidObserver) this.liquidObserver.disconnect();
    this.removeLiquid();
    this.unmountTimeline();

    for (const def of CATEGORY_DEFS) {
      document.body.style.removeProperty(def.varName);
    }
  }

  async loadSettings() {
    const saved = (await this.loadData()) || {};
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...saved,
      colors: {
        ...DEFAULT_SETTINGS.colors,
        ...(saved.colors || {}),
      },
    };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  applyColors() {
    for (const def of CATEGORY_DEFS) {
      const value =
        this.settings.colors[def.key] || DEFAULT_SETTINGS.colors[def.key];
      document.body.style.setProperty(def.varName, value);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Liquid glass tabs                                                  */
  /* ------------------------------------------------------------------ */

  setupLiquidTabs() {
    this.liquidObserver = new MutationObserver(() => this.scheduleLiquid());
    this.rebindLiquidObservers();
  }

  rebindLiquidObservers() {
    if (!this.liquidObserver) return;
    this.liquidObserver.disconnect();
    this.liquidObserved.clear();

    const inners = document.querySelectorAll(
      ".workspace-split.mod-root .workspace-tab-header-container-inner",
    );

    for (const inner of inners) {
      if (this.liquidObserved.has(inner)) continue;
      this.liquidObserver.observe(inner, {
        attributes: true,
        attributeFilter: ["class"],
        childList: true,
        subtree: true,
      });
      this.liquidObserved.add(inner);
    }
  }

  refreshLiquid() {
    this.rebindLiquidObservers();
    this.scheduleLiquid();
  }

  scheduleLiquid() {
    if (this.liquidFrame) return;
    this.liquidFrame = requestAnimationFrame(() => {
      this.liquidFrame = null;
      this.updateLiquidTabs();
    });
  }

  placeLiquid(blob, state) {
    blob.style.left = `${state.left}px`;
    blob.style.top = `${state.top}px`;
    blob.style.width = `${state.width}px`;
    blob.style.height = `${state.height}px`;
  }

  updateLiquidTabs() {
    if (!this.settings.liquidTabs) {
      this.removeLiquid();
      return;
    }

    const inners = document.querySelectorAll(
      ".workspace-split.mod-root .workspace-tab-header-container-inner",
    );

    for (const inner of inners) {
      const container = inner.parentElement || inner;
      let blob = inner.querySelector(":scope > .nle-tab-liquid");
      const active = inner.querySelector(
        ":scope > .workspace-tab-header.is-active",
      );
      const hasTabs = inner.querySelector(":scope > .workspace-tab-header");

      if (!hasTabs) {
        inner.classList.remove("nle-liquid-active");
        if (blob) blob.remove();
        continue;
      }

      // During Obsidian's re-render there can be a frame without .is-active.
      // Keep the old pill alive, just fade it out; do not teleport it.
      if (!active) {
        inner.classList.remove("nle-liquid-active");
        if (blob) blob.style.opacity = "0";
        continue;
      }

      const target = {
        left: active.offsetLeft,
        top: active.offsetTop,
        width: active.offsetWidth,
        height: active.offsetHeight,
      };
      const previous = this.liquidState.get(container) || this.lastLiquidState;
      const seq = String(++this.liquidSeq);

      if (!blob) {
        blob = document.createElement("div");
        blob.className = "nle-tab-liquid";
        blob.setAttribute("aria-hidden", "true");
        inner.insertBefore(blob, inner.firstChild);

        // Start from the last known position, force a layout read, then
        // let CSS transition the new position. This survives tab re-renders.
        blob.style.transition = "none";
        this.placeLiquid(blob, previous || target);
        blob.style.opacity = "1";
        void blob.offsetWidth;
        blob.style.transition = "";
        inner.classList.add("nle-liquid-active");
        blob.dataset.nleSeq = seq;

        requestAnimationFrame(() => {
          if (!blob.isConnected || blob.dataset.nleSeq !== seq) return;
          this.placeLiquid(blob, target);
        });
      } else {
        blob.style.transition = "";
        blob.style.opacity = "1";
        this.placeLiquid(blob, target);
        inner.classList.add("nle-liquid-active");
        blob.dataset.nleSeq = seq;
      }

      this.liquidState.set(container, target);
      this.lastLiquidState = target;
    }
  }

  removeLiquid() {
    document.querySelectorAll(".nle-tab-liquid").forEach((el) => el.remove());
    document
      .querySelectorAll(
        ".workspace-tab-header-container-inner.nle-liquid-active",
      )
      .forEach((el) => el.classList.remove("nle-liquid-active"));
    this.liquidState?.clear();
    this.lastLiquidState = null;
  }

  /* ------------------------------------------------------------------ */
  /* Block timelines                                                  */
  /* ------------------------------------------------------------------ */

  setupTimeline() {
    this.timelines = new Map();
  }

  isMarkdownViewVisible(view) {
    if (!view || !view.file) return false;
    const el = view.containerEl;
    if (!el || !el.isConnected || el.offsetParent === null) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 320 && rect.height > 200;
  }

  createTimelineEntry(view) {
    const el = document.createElement("div");
    el.className = "nle-timeline";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `
      <div class="nle-timeline-info">
        <div class="nle-timeline-count">Блок 1 / 1</div>
        <div class="nle-timeline-main"></div>
        <div class="nle-timeline-sub is-empty">Подблок: —</div>
        <div class="nle-timeline-pct">0%</div>
      </div>
      <div class="nle-timeline-rail" role="slider" aria-label="Навигация по блокам" tabindex="0">
        <div class="nle-timeline-track"></div>
        <div class="nle-timeline-fill"></div>
        <div class="nle-timeline-handle"></div>
      </div>
    `;

    const entry = {
      view,
      el,
      host: null,
      leaf: null,
      leafContent: null,
      dragging: false,
      info: el.querySelector(".nle-timeline-info"),
      count: el.querySelector(".nle-timeline-count"),
      main: el.querySelector(".nle-timeline-main"),
      sub: el.querySelector(".nle-timeline-sub"),
      pct: el.querySelector(".nle-timeline-pct"),
      rail: el.querySelector(".nle-timeline-rail"),
      handle: el.querySelector(".nle-timeline-handle"),
      fill: el.querySelector(".nle-timeline-fill"),
    };

    el.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      entry.dragging = true;
      el.setPointerCapture?.(event.pointerId);
      this.scrollEntryFromRail(entry, event);
    });

    el.addEventListener("pointermove", (event) => {
      if (entry.dragging) this.scrollEntryFromRail(entry, event);
    });

    const endDrag = () => {
      entry.dragging = false;
    };
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);

    // Wheel over the timeline scrolls the note instead of being swallowed.
    el.addEventListener(
      "wheel",
      (event) => {
        const scroller = this.getScroller(view);
        if (!scroller) return;
        event.preventDefault();
        let delta = event.deltaY;
        if (event.deltaMode === 1) delta *= 16;
        if (event.deltaMode === 2) delta *= scroller.clientHeight;
        scroller.scrollTop += delta;
        this.scheduleTimeline();
      },
      { passive: false },
    );

    return entry;
  }

  mountTimeline() {
    if (!this.settings.timeline) {
      this.unmountTimeline();
      return;
    }

    const views = this.app.workspace
      .getLeavesOfType("markdown")
      .map((leaf) => leaf.view)
      .filter((view) => this.isMarkdownViewVisible(view));

    const live = new Set(views);
    for (const view of [...this.timelines.keys()]) {
      if (!live.has(view)) this.removeTimelineEntry(view);
    }

    for (const view of views) {
      let entry = this.timelines.get(view);
      if (!entry) {
        entry = this.createTimelineEntry(view);
        this.timelines.set(view, entry);
      }

      const host = view.contentEl;
      if (!host) {
        this.removeTimelineEntry(view);
        continue;
      }

      if (entry.el.parentElement !== host) host.appendChild(entry.el);
      entry.host = host;
      entry.leaf = host.closest(".workspace-leaf");
      entry.leafContent = host.closest(".workspace-leaf-content");
    }

    this.scheduleTimeline();
  }

  removeTimelineEntry(view) {
    const entry = this.timelines.get(view);
    if (!entry) return;
    this.timelines.delete(view);

    entry.host?.classList.remove(
      "nle-timeline-on",
      "nle-timeline-gutter",
      "nle-timeline-narrow",
    );
    entry.leaf?.classList.remove("nle-timeline-leaf");
    entry.leafContent?.classList.remove("nle-timeline-leaf");
    entry.el.remove();
  }

  unmountTimeline() {
    for (const view of [...this.timelines.keys()]) {
      this.removeTimelineEntry(view);
    }
    this.timelines.clear();
    document.body.classList.remove("nle-timeline-global");
  }

  scheduleTimeline() {
    if (this.timelineFrame) return;
    this.timelineFrame = requestAnimationFrame(() => {
      this.timelineFrame = null;
      this.updateTimeline();
    });
  }

  updateTimeline() {
    if (!this.settings.timeline) {
      this.unmountTimeline();
      return;
    }

    let anyVisible = false;
    for (const [view, entry] of [...this.timelines.entries()]) {
      if (!view.containerEl?.isConnected) {
        this.removeTimelineEntry(view);
        continue;
      }
      if (this.updateTimelineEntry(entry)) anyVisible = true;
    }

    document.body.classList.toggle("nle-timeline-global", anyVisible);
  }

  updateTimelineEntry(entry) {
    const { view, el, host } = entry;
    if (!el.isConnected || !host || !host.isConnected) return false;

    const scroller = this.getScroller(view);
    const headings = scroller ? this.getHeadings(view) : [];
    const narrow = host.clientWidth < 980;
    const show = !!scroller && headings.length > 0 && !narrow;

    host.classList.toggle("nle-timeline-on", show);
    host.classList.toggle(
      "nle-timeline-gutter",
      show && !!this.settings.timelineGutter,
    );
    host.classList.toggle("nle-timeline-narrow", narrow);
    entry.leaf?.classList.toggle("nle-timeline-leaf", show);
    entry.leafContent?.classList.toggle("nle-timeline-leaf", show);

    if (!show) return false;

    const scrollable = Math.max(
      1,
      scroller.scrollHeight - scroller.clientHeight,
    );
    const progress = clamp(scroller.scrollTop / scrollable, 0, 1);

    const cachedText = this.fileTextCache.get(view.file.path);
    const lineCount = Math.max(
      1,
      view.editor?.lineCount?.() ||
        (view.data ? view.data.split("\n").length : 0) ||
        (cachedText ? cachedText.split("\n").length : 1),
    );
    const currentLine = Math.round(progress * (lineCount - 1));
    const context = this.buildHeadingContext(headings, currentLine);
    if (!context) return false;

    entry.count.textContent = `Блок ${context.mainIndex} / ${context.mainTotal}`;
    entry.main.textContent = cleanHeading(context.main.heading) || "Начало";
    entry.main.title = cleanHeading(context.main.heading) || "Начало";

    entry.sub.textContent = "";
    if (context.sub) {
      const counter = document.createElement("span");
      counter.textContent = `${context.subIndex} / ${context.subTotal}`;
      entry.sub.appendChild(counter);
      entry.sub.appendChild(
        document.createTextNode(" " + cleanHeading(context.sub.heading)),
      );
      entry.sub.classList.remove("is-empty");
      entry.sub.title = cleanHeading(context.sub.heading);
    } else {
      entry.sub.textContent = "Подблок: —";
      entry.sub.classList.add("is-empty");
      entry.sub.title = "";
    }

    entry.pct.textContent = `${Math.round(progress * 100)}%`;

    const railHeight = entry.rail.clientHeight || 248;
    const handleHeight = entry.handle.offsetHeight || 42;
    const handleTop = (railHeight - handleHeight) * progress + handleHeight / 2;
    entry.handle.style.top = `${handleTop}px`;
    entry.fill.style.height = `${progress * 100}%`;
    entry.rail.setAttribute(
      "aria-valuenow",
      String(Math.round(progress * 100)),
    );

    if (entry.info) {
      const infoHeight = entry.info.offsetHeight || 64;
      const infoTop = clamp(
        handleTop,
        infoHeight / 2 + 4,
        railHeight - infoHeight / 2 - 4,
      );
      el.style.setProperty("--nle-timeline-y", `${infoTop}px`);
    }

    return true;
  }

  scrollEntryFromRail(entry, event) {
    const scroller = this.getScroller(entry.view);
    if (!scroller) return;
    const rect = entry.rail.getBoundingClientRect();
    if (!rect.height) return;

    const ratio = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    const scrollable = Math.max(
      0,
      scroller.scrollHeight - scroller.clientHeight,
    );
    scroller.scrollTop = ratio * scrollable;
    this.scheduleTimeline();
  }

  getHeadings(view) {
    const cached = this.app.metadataCache.getFileCache(view.file)?.headings;
    if (cached && cached.length) {
      return cached
        .filter((h) => h.position?.start?.line != null)
        .map((h) => ({
          level: h.level,
          heading: h.heading,
          position: h.position,
        }))
        .sort((a, b) => a.position.start.line - b.position.start.line);
    }

    const text =
      view.editor?.getValue?.() ||
      view.data ||
      this.fileTextCache.get(view.file.path) ||
      "";

    if (!text) {
      this.loadFileText(view.file);
      return [];
    }

    return parseHeadingsFromText(text);
  }

  async loadFileText(file) {
    if (!file || this.fileTextLoading.has(file.path)) return;
    this.fileTextLoading.add(file.path);
    try {
      const text = await this.app.vault.cachedRead(file);
      this.fileTextCache.set(file.path, text);
    } catch (error) {
      // The file may have been renamed/deleted while reading.
    } finally {
      this.fileTextLoading.delete(file.path);
      this.scheduleTimeline();
    }
  }

  getScroller(view) {
    const content = view.contentEl;
    const candidates = [
      content.querySelector(".cm-scroller"),
      content.querySelector(".markdown-preview-view"),
      content.querySelector(".markdown-reading-view"),
      content,
    ].filter(Boolean);

    const scrollable = candidates.filter((el) => {
      const overflowY = getComputedStyle(el).overflowY;
      return (
        (overflowY === "auto" ||
          overflowY === "scroll" ||
          overflowY === "overlay") &&
        el.scrollHeight > el.clientHeight + 2
      );
    });

    const pool = scrollable.length ? scrollable : candidates;
    if (!pool.length) return null;

    return pool.sort(
      (a, b) =>
        b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight),
    )[0];
  }

  buildHeadingContext(headings, currentLine) {
    if (!headings.length) return null;

    const levels = [...new Set(headings.map((h) => h.level))].sort(
      (a, b) => a - b,
    );
    const firstLevelCount = headings.filter(
      (h) => h.level === levels[0],
    ).length;
    let mainLevel = levels[0];
    if (levels[0] === 1 && firstLevelCount === 1 && levels.length > 1) {
      mainLevel = levels[1];
    }

    let mains = headings.filter((h) => h.level === mainLevel);
    if (!mains.length) {
      mainLevel = levels[0];
      mains = headings.filter((h) => h.level === mainLevel);
    }
    if (!mains.length) return null;

    let mainIndex = 0;
    for (let i = 0; i < mains.length; i++) {
      if (mains[i].position.start.line <= currentLine) mainIndex = i;
    }

    const main = mains[mainIndex];
    const nextMainLine = mains[mainIndex + 1]?.position.start.line ?? Infinity;

    const sectionHeadings = headings.filter(
      (h) =>
        h.position.start.line > main.position.start.line &&
        h.position.start.line < nextMainLine &&
        h.level > mainLevel,
    );

    const subLevels = [...new Set(sectionHeadings.map((h) => h.level))].sort(
      (a, b) => a - b,
    );
    const subLevel = subLevels[0];

    const subs = sectionHeadings.filter((h) => h.level === subLevel);

    let subIndex = -1;
    for (let i = 0; i < subs.length; i++) {
      if (subs[i].position.start.line <= currentLine) subIndex = i;
    }

    return {
      main,
      mainIndex: mainIndex + 1,
      mainTotal: mains.length,
      subs,
      sub: subIndex >= 0 ? subs[subIndex] : null,
      subIndex: subIndex + 1,
      subTotal: subs.length,
    };
  }
};
