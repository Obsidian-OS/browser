import {
    Command,
    ItemView,
    Menu,
    Notice,
    TextComponent,
    ViewStateResult,
    WorkspaceLeaf,
    apiVersion,
    ButtonComponent
} from "obsidian";
import type {MenuItem as NativeMenuItem} from "obsidian";
import type {WebviewTag, ContextMenuEvent} from 'electron';
import {BrowserSettings} from "./main.js";

interface MenuItem extends NativeMenuItem {
    callback: () => void;
    dom: HTMLElement;
    setSubmenu: () => Menu;
    disabled: boolean;
}

export const BROWSER_VIEW = "browser-view";

export interface BrowserViewState {
    url: string
}

export default class BrowserView extends ItemView implements BrowserViewState {
    url_bar: TextComponent = null as any;

    back: HTMLButtonElement = null as any;
    fwd: HTMLButtonElement = null as any;

    pretty: HTMLDivElement = null as any;
    webview: WebviewTag = null as any;
    favicon: string[] = [];
    isLoading: 'no' | 'awaiting' | 'loading' = 'no';
    title: string = '';

    constructor(leaf: WorkspaceLeaf, public url: string = '', private settings: BrowserSettings) {
        super(leaf)
    }

    getState(): BrowserViewState {
        return {
            url: this.url
        }
    }

    async setState(state: BrowserViewState, result: ViewStateResult) {
        Object.assign(this, state);
        return super.setState(state, result);
    }

    getViewType(): string {
        return BROWSER_VIEW;
    }

    getDisplayText(): string {
        return 'New Browser Tab';
    }

    public getUrl(): string {
        return this.url_bar?.getValue();
    }

    async onOpen() {
        this.contentEl.addClass("browser-tab-container");
        const container = this.containerEl.children[1];

        container.empty();

        const header = this.contentEl.parentElement?.querySelector(".view-header-title-container");
        if (header)
            this.buildHeader(header as HTMLElement);

        this.webview = container.createEl("webview" as any, {
            attr: {
                src: this.getState().url || this.settings.home,
                // useragent: `obsidian-os/${oos.version};obsidian/${apiVersion};obsidian-browser/${pkg.version}`
            },
            cls: ["browser-tab-webview"]
        });

        this.webview.addEventListener("did-navigate", e => this.didNavigate(e.url));
        this.webview.addEventListener("did-navigate-in-page", e => this.didNavigate(e.url));
        this.webview.addEventListener("page-title-updated", e => {
            this.title = e.title;
            this.updateTab();
        });
        this.webview.addEventListener("page-favicon-updated", e => {
            this.favicon = e.favicons;
            this.updateTab();
        });
        this.webview.addEventListener("did-start-loading", e => this.updateTab());
        this.webview.addEventListener("did-finish-loading", e => this.updateTab());
        this.webview.addEventListener("did-fail-load", e => this.updateTab());
        this.webview.addEventListener("did-frame-finish-load", e => this.updateTab());
        this.webview.addEventListener("did-stop-loading", e => this.updateTab());
        this.webview.addEventListener("context-menu", ctx => this.showMenu(ctx));

        this.url_bar.inputEl.addEventListener("change", async e => await this.navigate((e.target as HTMLInputElement).value));

        this.bindNavigationButtons();
    }

    showMenu(ctx: ContextMenuEvent) {
        const menu = new Menu();

        if (ctx.params.linkURL) {
            menu.addItem(item => item
                .setTitle("Open link in new tab")
                .onClick(_ => new Notice("Opening in new Tab")));

            menu.addItem(item => {
                const submenu = (item as MenuItem)
                    .setTitle("More link actions")
                    .setSubmenu();

                submenu.addItem(cb => cb.setTitle("Copy link text"));
                submenu.addItem(cb => cb.setTitle("Copy link URL"));
//                submenu.addItem(cb => cb.setTitle("Copy link text"));
            });

            menu.addSeparator();
        }

        menu.addItem(cb => cb
            .setTitle("Open Developer Tools")
            .onClick(e => {
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                this.webview.inspectElement(rect.left, rect.top);
            }));

        menu.showAtPosition({
            x: ctx.params.x,
            y: ctx.params.y
        });
    }

    didNavigate(url: string) {
        this.url_bar.setValue(url);
        this.navigate(url, false);

        this.setState({url}, {history: true});

    }

    buildHeader(container: HTMLElement) {
        const nav = container.parentElement?.querySelector(".view-header-nav-buttons");

        if (nav) {
            this.back = nav.querySelector(":first-child")!;
            this.fwd = nav.querySelector(":last-child")!;

            this.back.addEventListener('click', _ => this.navigateBack());
            this.fwd.addEventListener('click', _ => this.navigateFwd());
        }

        const url_bar = document.createElement("div");
        url_bar.addClass("search-input-container");
        url_bar.addClass("url-bar");

        this.url_bar = new TextComponent(url_bar);
        this.url_bar.inputEl.type = "search";

        this.pretty = url_bar.createDiv({cls: "pretty-container"});

        this.url_bar.inputEl.addEventListener("focus", e => (e.target as HTMLInputElement).select());

        container.replaceWith(url_bar);
    }

    updateTab() {
        // only update the tab title if we're the active tab
        if (!this.containerEl.closest('.workspace-leaf.mod-active'))
            return;

        const tab = this.containerEl.closest('.workspace-tabs')?.querySelector('.workspace-tab-header.is-active.mod-active')

        const icon = tab?.querySelector('.workspace-tab-header-inner-icon') as HTMLElement | null;
        const title = tab?.querySelector('.workspace-tab-header-inner-title') as HTMLElement | null;

        if (this.webview.isWaitingForResponse()) {
            const img = document.createElement('svg');
            img.classList.add('favicon');

            img.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <style>.spinner_S1WN{animation:spinner_MGfb .8s linear infinite;animation-delay:-.8s}.spinner_Km9P{animation-delay:-.65s}.spinner_JApP{animation-delay:-.5s}@keyframes spinner_MGfb{93.75%,100%{opacity:.2}}</style>
                    <circle class="spinner_S1WN" cx="4" cy="12" r="3" fill="currentColor"/>
                    <circle class="spinner_S1WN spinner_Km9P" cx="12" cy="12" r="3" fill="currentColor"/>
                    <circle class="spinner_S1WN spinner_JApP" cx="20" cy="12" r="3" fill="currentColor"/>
                </svg>`;

            icon?.replaceChildren(img);
        } else if (this.webview.isLoading()) {
            const img = document.createElement('svg');
            img.classList.add('favicon');

            img.innerHTML = `
                <svg width="16" height="16" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <style>.spinner_V8m1{transform-origin:center;animation:spinner_zKoa 2s linear infinite}.spinner_V8m1 circle{stroke-linecap:round;animation:spinner_YpZS 1.5s ease-in-out infinite}@keyframes spinner_zKoa{100%{transform:rotate(360deg)}}@keyframes spinner_YpZS{0%{stroke-dasharray:0 150;stroke-dashoffset:0}47.5%{stroke-dasharray:42 150;stroke-dashoffset:-16}95%,100%{stroke-dasharray:42 150;stroke-dashoffset:-59}}</style>
                    <g class="spinner_V8m1">
                        <circle cx="12" cy="12" r="9.5" fill="none" stroke-width="3"></circle>
                    </g>
                </svg>`;

            icon?.replaceChildren(img);
        } else {
            if (this.favicon[0]) {
                const img = document.createElement('img');
                img.classList.add('favicon');
                img.setAttr('src', this.favicon[0]);
                icon?.replaceChildren(img);
            } else {
                const img = document.createElement('svg');
                img.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-file"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>'
                icon?.replaceChildren(img);
            }
        }

        if (title)
            title.innerText = this.title;
    }

    async navigate(search: string, updateUrl: boolean = true) {
        let url: URL;

        if (URL.canParse(search))
            url = new URL(search);

        else if (search.includes('.') && URL.canParse('http://' + search))
            url = new URL('http://' + search);

        else { // TODO: Move search engine to settings
            const searchEngine = this.settings.searchEngines[this.settings.defaultSearchEngine];
            url = new URL(searchEngine.href);
            url.searchParams.set(searchEngine.query, search);
        }

        this.url_bar.setValue(url.href);

        if (updateUrl)
            await this.webview.loadURL(url.href);

        this.pretty.empty();

        this.pretty.createSpan({text: url.protocol.slice(0, -1), cls: ['url-part', 'proto']});
        this.pretty.createSpan({text: url.host, cls: ['url-part', 'domain']});
        this.pretty.createSpan({text: url.pathname, cls: ['url-part', 'path']});
        this.pretty.createSpan({text: url.search.slice(1), cls: ['url-part', 'query']});
        this.pretty.createSpan({text: url.hash.slice(1), cls: ['url-part', 'hash']});

        this.bindNavigationButtons();
    }

    navigateBack() {
        if (this.webview.canGoBack())
            this.webview.goBack();

        this.bindNavigationButtons();
    }

    navigateFwd() {
        if (this.webview.canGoForward())
            this.webview.goForward();

        this.bindNavigationButtons();
    }

    bindNavigationButtons() {
        if (this.webview.canGoBack())
            this.back.setAttribute('aria-disabled', 'false');
        else
            this.back.setAttribute('aria-disabled', 'true');

        if (this.webview.canGoForward())
            this.fwd.setAttribute('aria-disabled', 'false');
        else
            this.fwd.setAttribute('aria-disabled', 'true');
    }

    onPaneMenu(menu: Menu, source: "more-options" | "tab-header" | string): void {
        super.onPaneMenu(menu, source);

        menu.addItem(item => item
            .setTitle("Duplicate Tab")
            .onClick(e => (this.app as any as {
                commands: {
                    executeCommandById: (command: string) => void
                }
            }).commands.executeCommandById('obsidian-os/browser:duplicate-browser-tab')));

        menu.addSeparator();

        menu.addItem(item => item
            .setTitle("Zoom In")
            .onClick(_ => this.webview.setZoomLevel(this.webview.getZoomLevel() + 0.2)));

        menu.addItem(item => item
            .setTitle("Reset Zoom")
            .onClick(_ => this.webview.setZoomLevel(0)));

        menu.addItem(item => item
            .setTitle("Zoom Out")
            .onClick(_ => this.webview.setZoomLevel(this.webview.getZoomLevel() - 0.2)));
    }
}