import React from 'react';
import * as rdom from "react-dom/client";
import * as obs from "obsidian";
import * as lucide from 'lucide';

import Ui from "./browser.js";
import BrowserPlugin from "./main.js";

export const BROWSER_VIEW = "browser-view";

lucide.createIcons({icons: lucide.icons});

export const AppContext = React.createContext<obs.App | null>(null);

interface BrowserState extends Record<string, any> {
    url: string,
    title: string,
    favicon: null | string,
    status: 'loaded' | 'loading' | 'waiting'
}

export default class Browser extends obs.View {
    private root: rdom.Root | null = null;
    private readonly state: BrowserState;

    get tab(): HTMLElement | null {
        if (!this.containerEl.closest('.workspace-leaf.mod-active'))
            return null;

        return this.containerEl.closest('.workspace-tabs')?.querySelector('.workspace-tab-header.is-active.mod-active') ?? null;
    }

    get faviconEl(): HTMLElement | null {
        return this.tab?.querySelector('.workspace-tab-header-inner-icon') ?? this.tab?.createDiv({
            cls: "workspace-tab-header-inner-icon"
        }) ?? null;
    }

    get titleEl(): HTMLElement | null {
        return this.tab?.querySelector('.workspace-tab-header-inner-title') ?? this.tab?.createDiv({
            cls: "workspace-tab-header-inner-title"
        }) ?? null;
    }

    constructor(leaf: obs.WorkspaceLeaf, readonly plugin: BrowserPlugin) {
        super(leaf);

        this.state = {
            url: plugin.settings.home,
            title: "",
            favicon: null,
            status: 'loaded'
        };
    }

    getViewType(): string {
        return BROWSER_VIEW
    }

    getDisplayText(): string {
        return this.state.title;
        // return ""
    }

    getIcon(): string {
        return "globe";
    }

    onPaneMenu(menu: obs.Menu, source: string) {
        menu.addItem(item => item
            .setIcon("settings")
            .setTitle("Browser Preferences"));
    }

    protected async onOpen(): Promise<void> {
        this.containerEl.addClass("browser-tab-container");
        this.containerEl.empty();

        (this.root = rdom.createRoot(this.containerEl))
            .render(<AppContext.Provider value={this.app}>
                <Ui browser={this} settings={this.plugin.settings}/>
            </AppContext.Provider>);
    }

    protected async onClose(): Promise<void> {
        this.root?.unmount();
    }

    getState(): BrowserState {
        return this.state;
    }

    async setState(state: BrowserState, result: obs.ViewStateResult): Promise<void> {
        Object.assign(this.state, state ?? {});

        this.faviconEl?.replaceChildren(this.getFavicon());

        if (this.titleEl)
            this.titleEl.innerText = state.title;

        return await super.setState(state, result);
    }

    private getFavicon(): HTMLElement {
        const icon = document.createElement("div");
        icon.classList.add("favicon-container");

        if (this.state.status == "waiting")
            icon.replaceChildren(waiting());
        else if (this.state.status == "loading")
            icon.replaceChildren(loading())
        else if (this.state.favicon)
            icon.replaceChildren(icon.createEl("img", {
                cls: ["favicon"],
                attr: {
                    src: this.state.favicon
                }
            }))
        else {
            let file = lucide.createElement(lucide.icons.File);

            file.setAttr("width", "16px");
            file.setAttr("height", "16px");

            icon.replaceChildren(file);
        }

        return icon;
    }
}

export const waiting = () => {
    const img = document.createElement('svg');
    img.classList.add('favicon');

    img.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <style>.spinner_S1WN{animation:spinner_MGfb .8s linear infinite;animation-delay:-.8s}.spinner_Km9P{animation-delay:-.65s}.spinner_JApP{animation-delay:-.5s}@keyframes spinner_MGfb{93.75%,100%{opacity:.2}}</style>
        <circle class="spinner_S1WN" cx="4" cy="12" r="3" fill="currentColor"/>
        <circle class="spinner_S1WN spinner_Km9P" cx="12" cy="12" r="3" fill="currentColor"/>
        <circle class="spinner_S1WN spinner_JApP" cx="20" cy="12" r="3" fill="currentColor"/>
    </svg>`;

    return img;
}

export const loading = () => {
    const img = document.createElement('svg');
    img.classList.add('favicon');

    img.innerHTML = `<svg width="16" height="16" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <style>.spinner_V8m1{transform-origin:center;animation:spinner_zKoa 2s linear infinite}.spinner_V8m1 circle{stroke-linecap:round;animation:spinner_YpZS 1.5s ease-in-out infinite}@keyframes spinner_zKoa{100%{transform:rotate(360deg)}}@keyframes spinner_YpZS{0%{stroke-dasharray:0 150;stroke-dashoffset:0}47.5%{stroke-dasharray:42 150;stroke-dashoffset:-16}95%,100%{stroke-dasharray:42 150;stroke-dashoffset:-59}}</style>
        <g class="spinner_V8m1">
            <circle cx="12" cy="12" r="9.5" fill="none" stroke-width="3"></circle>
        </g>
    </svg>`;

    return img;
}